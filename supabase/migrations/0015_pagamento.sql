-- Pagamento pela Cakto (docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md §7). Só o servidor lê e grava.
set local lock_timeout = '10s';

create table public.checkouts (
  codigo     text primary key check (codigo ~ '^[0-9a-f]{32}$'),
  visitante  uuid not null,
  plano      text not null check (plano in ('basic', 'pro')),
  periodo    text not null check (periodo in ('mensal', 'anual')),
  criado_em  timestamptz not null default now()
);

create table public.assinaturas (
  id               uuid primary key default gen_random_uuid(),
  cakto_assinatura text unique,
  cakto_pedido     text not null,
  plano            text not null check (plano in ('basic', 'pro')),
  periodo          text not null check (periodo in ('mensal', 'anual')),
  email            text,
  status           text not null default 'ativa' check (status in ('ativa', 'cancelada', 'estornada')),
  valido_ate       timestamptz not null,
  chave            text not null unique check (chave ~ '^EM-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index assinaturas_email_idx on public.assinaturas (email, plano);

create table public.assinatura_navegadores (
  assinatura uuid not null references public.assinaturas (id) on delete cascade,
  visitante  uuid not null,
  criado_em  timestamptz not null default now(),
  primary key (assinatura, visitante)
);
create index assinatura_navegadores_visitante_idx on public.assinatura_navegadores (visitante);

create table public.cakto_eventos (
  pedido      text not null,
  evento      text not null,
  recebido_em timestamptz not null default now(),
  corpo       jsonb not null,
  primary key (pedido, evento)
);

-- Plano do navegador: a maior assinatura válida ligada a ele (Pro > Basic), ou 'gratis'.
create function public.plano_do_visitante(p_visitante uuid)
returns text language sql stable as $$
  select coalesce(
    (select a.plano from public.assinatura_navegadores n
       join public.assinaturas a on a.id = n.assinatura
      where n.visitante = p_visitante and a.status <> 'estornada' and a.valido_ate > now()
      order by (a.plano = 'pro') desc limit 1),
    'gratis')
$$;

-- Liga um navegador a uma assinatura, até 3 (o mesmo navegador de novo não conta). Devolve 'ok', 'cheia' ou 'sem_assinatura'.
create function public.ligar_navegador(p_assinatura uuid, p_visitante uuid)
returns text language plpgsql as $$
declare v_n int;
begin
  perform pg_advisory_xact_lock(hashtextextended('assinatura:' || p_assinatura::text, 0));
  if not exists (select 1 from public.assinaturas where id = p_assinatura) then return 'sem_assinatura'; end if;
  if exists (select 1 from public.assinatura_navegadores where assinatura = p_assinatura and visitante = p_visitante) then return 'ok'; end if;
  select count(*) into v_n from public.assinatura_navegadores where assinatura = p_assinatura;
  if v_n >= 3 then return 'cheia'; end if;
  insert into public.assinatura_navegadores (assinatura, visitante) values (p_assinatura, p_visitante);
  return 'ok';
end $$;

alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso',
                  'limite_atingido', 'conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto', 'assinou'));

-- Retenção diária (0006/0009): também checkouts com mais de 30 dias e eventos da Cakto com mais de 180.
create or replace function public.aplicar_retencao()
returns bigint language sql as $$
  delete from public.uso_diario where dia < (now() at time zone 'America/Sao_Paulo')::date;
  delete from public.checkouts where criado_em < now() - interval '30 days';
  delete from public.cakto_eventos where recebido_em < now() - interval '180 days';
  with apagadas as (
    delete from public.contratacoes
    where encerramento_em is null or encerramento_em < now() - interval '7 days'
    returning 1
  )
  select count(*) from apagadas
$$;

alter table public.checkouts enable row level security;
alter table public.assinaturas enable row level security;
alter table public.assinatura_navegadores enable row level security;
alter table public.cakto_eventos enable row level security;
revoke all on table public.checkouts, public.assinaturas, public.assinatura_navegadores, public.cakto_eventos from public, anon, authenticated;
grant select, insert, update, delete on table public.checkouts, public.assinaturas, public.assinatura_navegadores, public.cakto_eventos to service_role;
revoke execute on function public.plano_do_visitante(uuid) from public, anon, authenticated;
revoke execute on function public.ligar_navegador(uuid, uuid) from public, anon, authenticated;
grant execute on function public.plano_do_visitante(uuid) to service_role;
grant execute on function public.ligar_navegador(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
