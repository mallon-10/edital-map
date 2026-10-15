-- Edital Map · agendamento confiável do sync
-- O agendamento do GitHub Actions atrasou e descartou rodadas (3 de ~9 em 18 h, 14–15/10/2026).
-- Aqui o próprio Supabase (pg_cron) chama a API do GitHub a cada 2 h para rodar o workflow sync.yml.
-- A chave do GitHub fica no Vault com o nome 'github_disparo' (token fine-grained só com
-- Actions: read and write no repositório mallon-10/edital-map). Nunca no código.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.disparar_sync()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
  pedido bigint;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_disparo';
  if token is null then
    raise exception 'Segredo github_disparo ausente no Vault';
  end if;
  select net.http_post(
    url := 'https://api.github.com/repos/mallon-10/edital-map/actions/workflows/sync.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'edital-map-pg-cron',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('ref', 'main')
  ) into pedido;
  return pedido;
end $$;

-- Só o banco (postgres / pg_cron) executa; a API pública não.
revoke execute on function public.disparar_sync() from public, anon, authenticated;

-- Minuto 17 de cada 2 h, em UTC (horário do pg_cron no Supabase).
select cron.schedule('sync-pncp', '17 */2 * * *', $$select public.disparar_sync()$$);
