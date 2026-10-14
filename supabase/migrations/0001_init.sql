-- BidAtlas · schema inicial (Supabase / Postgres 15+)
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- Busca sem acento ("seguranca" encontra "segurança")
create or replace function public.sem_acento(t text)
returns text language sql immutable parallel safe strict
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, t) $$;

-- Municípios: seed do CSV kelvins/municipios-brasileiros
create table public.municipios (
  codigo_ibge text primary key,
  nome        text not null,
  uf          text not null,
  lat         double precision not null,
  lng         double precision not null
);

-- Uma linha por contratação publicada no PNCP
create table public.contratacoes (
  id                  text primary key,          -- numeroControlePNCP
  cnpj                text not null,
  ano                 int  not null,
  sequencial          int  not null,
  slug                text generated always as (cnpj || '-' || ano::text || '-' || sequencial::text) stored unique,
  objeto              text not null,
  info_complementar   text,
  orgao_nome          text not null,
  unidade_nome        text,
  esfera              text,                      -- F, E, M, D
  codigo_ibge         text,                      -- sede da unidade compradora
  uf                  text not null,
  municipio_nome      text,
  modalidade_id       int  not null,
  modalidade_nome     text,
  situacao_id         int,
  situacao_nome       text,
  srp                 boolean not null default false,
  valor_estimado      numeric(16,2),             -- null ou 0 = não informado
  valor_homologado    numeric(16,2),
  publicada_em        timestamptz,
  abertura_em         timestamptz,
  encerramento_em     timestamptz,
  link_origem         text,
  atualizada_pncp_em  timestamptz not null,
  sincronizada_em     timestamptz not null default now(),
  busca tsvector generated always as (
    setweight(to_tsvector('portuguese', public.sem_acento(coalesce(objeto, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.sem_acento(coalesce(info_complementar, ''))), 'C')
  ) stored,
  unique (cnpj, ano, sequencial)
);

create table public.itens (
  contratacao_id          text not null references public.contratacoes(id) on delete cascade,
  numero                  int  not null,
  descricao               text not null,
  quantidade              numeric(18,4),
  unidade                 text,
  valor_unitario_estimado numeric(16,4),
  valor_total_estimado    numeric(16,2),
  material_ou_servico     text,                  -- M ou S
  sigiloso                boolean not null default false,
  tem_resultado           boolean not null default false,
  busca tsvector generated always as (to_tsvector('portuguese', public.sem_acento(descricao))) stored,
  primary key (contratacao_id, numero)
);

-- Contratos assinados: base do "quem venceu" (só fornecedor PJ)
create table public.contratos (
  id               text primary key,             -- numeroControlePNCP do contrato
  contratacao_id   text,                         -- numeroControlePncpCompra
  cnpj_orgao       text not null,
  orgao_nome       text,
  fornecedor_cnpj  text not null,
  fornecedor_nome  text not null,
  objeto           text,
  valor_global     numeric(16,2),
  assinado_em      date,
  codigo_ibge      text,
  uf               text,
  busca tsvector generated always as (to_tsvector('portuguese', public.sem_acento(coalesce(objeto, '')))) stored
);

create table public.perfis (
  id                 uuid primary key references auth.users(id) on delete cascade,
  plano              text not null default 'gratis' check (plano in ('gratis', 'pro', 'business')),
  assinatura_id      text,
  assinatura_status  text,
  buscas_dia         date,
  buscas_qtd         int not null default 0,
  criado_em          timestamptz not null default now()
);

create table public.radares (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nome            text not null default 'Meu radar',
  termos          text[] not null,
  termos_excluir  text[] not null default '{}',
  ufs             text[] not null default '{}',
  valor_min       numeric(16,2),
  modalidades     int[]  not null default '{}',
  email_diario    boolean not null default true,
  ativo           boolean not null default true,
  ultimo_envio    timestamptz,
  criado_em       timestamptz not null default now()
);

create table public.salvos (
  user_id         uuid not null references auth.users(id) on delete cascade,
  contratacao_id  text not null references public.contratacoes(id) on delete cascade,
  criado_em       timestamptz not null default now(),
  primary key (user_id, contratacao_id)
);

create table public.alertas_enviados (
  radar_id        uuid not null references public.radares(id) on delete cascade,
  contratacao_id  text not null,
  enviado_em      timestamptz not null default now(),
  primary key (radar_id, contratacao_id)
);

-- Controle da sincronização (uma linha por fonte + modalidade)
create table public.sync_estado (
  chave            text primary key,             -- ex.: 'contratacoes:6'
  ultima_data      date not null,
  ultima_execucao  timestamptz,
  status           text,
  erro             text
);

create index contratacoes_busca_idx on public.contratacoes using gin (busca);
create index contratacoes_encerramento_idx on public.contratacoes (encerramento_em);
create index contratacoes_uf_idx on public.contratacoes (uf, encerramento_em);
create index contratacoes_ibge_idx on public.contratacoes (codigo_ibge);
create index itens_busca_idx on public.itens using gin (busca);
create index contratos_busca_idx on public.contratos using gin (busca);
create index contratos_fornecedor_idx on public.contratos (fornecedor_cnpj);

-- Texto do usuário -> tsquery por prefixo ("epi" acha "EPIs").
-- Vírgula, ";", " e " e " ou " separam alternativas: "EPI e uniformes" = EPI OU uniformes.
create or replace function public.consulta(q text) returns tsquery
language plpgsql immutable as $$
declare
  grupos text[];
  g text;
  partes text[];
  tq tsquery;
  resultado tsquery;
begin
  if coalesce(trim(q), '') = '' then return null; end if;
  grupos := regexp_split_to_array(lower(public.sem_acento(q)), '\s*[,;|]\s*|\s+(e|ou)\s+');
  foreach g in array grupos loop
    select array_agg(w || ':*') into partes
      from regexp_split_to_table(g, '[^a-z0-9]+') w
     where length(w) >= 2;
    continue when partes is null;
    tq := to_tsquery('portuguese', array_to_string(partes, ' & '));
    continue when numnode(tq) = 0;
    resultado := case when resultado is null then tq else resultado || tq end;
  end loop;
  return resultado;
end $$;

-- Oportunidades abertas que casam com a busca (base da lista e do mapa)
create or replace function public.abertas(q text, p_ufs text[] default null, p_valor_min numeric default null)
returns setof public.contratacoes language sql stable as $$
  with t as (select public.consulta(q) as tq)
  select c.*
  from public.contratacoes c, t
  where c.encerramento_em > now()
    and (t.tq is null
         or c.busca @@ t.tq
         or exists (select 1 from public.itens i where i.contratacao_id = c.id and i.busca @@ t.tq))
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
$$;

-- Lista: prazo mais próximo primeiro (o servidor aplica o limite do plano)
create or replace function public.buscar(q text, p_ufs text[] default null, p_valor_min numeric default null,
                                         p_limite int default 10, p_offset int default 0)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text,
               valor_estimado numeric, encerramento_em timestamptz, modalidade_nome text)
language sql stable as $$
  select a.id, a.slug, a.objeto, a.orgao_nome, a.municipio_nome, a.uf,
         a.valor_estimado, a.encerramento_em, a.modalidade_nome
  from public.abertas(q, p_ufs, p_valor_min) a
  order by a.encerramento_em asc
  limit p_limite offset p_offset
$$;

-- Mapa: um ponto por município, com contagem, valor e prazo mais próximo
create or replace function public.mapa(q text, p_ufs text[] default null, p_valor_min numeric default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(a.valor_estimado, 0)), min(a.encerramento_em)
  from public.abertas(q, p_ufs, p_valor_min) a
  join public.municipios m on m.codigo_ibge = a.codigo_ibge
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
$$;

-- Segurança: dados de licitação só saem pelo servidor (que aplica o plano)
alter table public.municipios       enable row level security;
alter table public.contratacoes     enable row level security;
alter table public.itens            enable row level security;
alter table public.contratos        enable row level security;
alter table public.perfis           enable row level security;
alter table public.radares          enable row level security;
alter table public.salvos           enable row level security;
alter table public.alertas_enviados enable row level security;
alter table public.sync_estado      enable row level security;

create policy "municipios públicos" on public.municipios for select using (true);
create policy "perfil próprio"      on public.perfis  for select using (auth.uid() = id);
create policy "radares próprios"    on public.radares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "salvos próprios"     on public.salvos  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cria o perfil grátis quando alguém se cadastra
create or replace function public.novo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id) values (new.id);
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_perfil();
