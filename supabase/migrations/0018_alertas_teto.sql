-- Edital Map · Evolução · Fase 4 · Teto de alertas por conta no banco (0018).
-- O site confere o limite antes de criar (POST /api/alertas: contarAlertas + bloqueioAlerta, mensagem amigável), mas
-- dois pedidos ao mesmo tempo passavam os dois pela conferência. Este gatilho fecha a corrida: antes de cada insert em
-- public.alertas, trava a conta (advisory lock da transação, por user_id), conta os alertas dela (ativos e pausados) e
-- recusa a partir de 5 (o teto do Pro, LIMITES_CONTA.pro.alertas) com 'alertas_teto' (ERRO_TETO_ALERTAS em
-- lib/alertas/regras.ts; o site responde o mesmo 402 `limite`). O plano (Grátis = nenhum) continua no site.
-- Não muda a 0016 (já aplicada). Pré-requisito: 0016. Aplicar com npm run db:aplicar; guarda em scripts/migracoes.test.ts.

set local lock_timeout = '10s';

create or replace function public.alertas_teto()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_qtd int;
begin
  -- Pedidos da mesma conta entram um de cada vez até o fim da transação; contas diferentes não se esperam.
  perform pg_advisory_xact_lock(hashtext('alertas:' || new.user_id::text));
  select count(*) into v_qtd from public.alertas a where a.user_id = new.user_id;
  if v_qtd >= 5 then
    raise exception 'alertas_teto' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists alertas_teto on public.alertas;
create trigger alertas_teto
  before insert on public.alertas
  for each row execute function public.alertas_teto();

revoke execute on function public.alertas_teto() from public, anon, authenticated;
