-- Edital Map · Fase 3 · Brasil todo · M2: sem a tabela de itens, retenção diária e sync a cada 3 h.
-- Só aplicar depois que o site em produção e o worker do main forem os do M1 (nenhum dos dois lê itens).
-- Depois desta migração: npm run db:medir -- --vacuum (VACUUM FULL não roda dentro de transação).

set local statement_timeout = 0;

-- Os itens agora ficam só como palavras + resumo na contratação (0005).
drop table public.itens;

-- Retenção: fica só o que está aberto ou encerrou há até 7 dias. Devolve quantas contratações apagou.
create or replace function public.aplicar_retencao()
returns bigint language sql as $$
  with apagadas as (
    delete from public.contratacoes
    where encerramento_em is null or encerramento_em < now() - interval '7 days'
    returning 1
  )
  select count(*) from apagadas
$$;

revoke execute on function public.aplicar_retencao() from public, anon, authenticated;
grant execute on function public.aplicar_retencao() to service_role;

-- Primeira limpeza agora; depois, todo dia às 04h45 UTC (01h45 em Brasília, longe das rodadas do sync).
select public.aplicar_retencao();
select cron.schedule('retencao-contratacoes', '45 4 * * *', $$select public.aplicar_retencao()$$);

-- Sync a cada 3 h (cabe nos 2.000 min/mês do GitHub Actions). Falha alto se o job não existir;
-- só altera se o horário for diferente (reaplicar o arquivo não falha).
do $$
declare
  id bigint;
begin
  select jobid into id from cron.job where jobname = 'sync-pncp';
  if id is null then
    raise exception 'Job sync-pncp não encontrado no pg_cron';
  end if;
  if exists (select 1 from cron.job where jobid = id and schedule is distinct from '17 */3 * * *') then
    perform cron.alter_job(id, schedule := '17 */3 * * *');
  end if;
end $$;
