-- Edital Map · Fase 2 (site): busca sem duplicadas, relevância em dois blocos, mapa por município e medição.

-- Objeto sem prefixo entre colchetes ("[Portal de Compras Públicas] -"), sem acento, minúsculo, espaços colapsados.
create or replace function public.objeto_normalizado(t text) returns text
language sql immutable parallel safe as $$
  select btrim(regexp_replace(
    lower(public.sem_acento(regexp_replace(coalesce(t, ''), '^\s*\[[^\]]*\]\s*-?\s*', ''))),
    '\s+', ' ', 'g'))
$$;

-- Abertas sem duplicadas: a mesma publicação repetida no PNCP tem mesmo município, prazo, valor e objeto.
-- Fica a que tem link de origem; empate → atualizada por último.
create or replace function public.abertas_unicas(q text, p_ufs text[] default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto)) a.*
  from public.abertas(q, p_ufs, null) a
  order by a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto),
           (a.link_origem is null), a.atualizada_pncp_em desc
$$;

-- Lista: primeiro quem tem o termo no objeto, depois quem só tem nos itens; dentro de cada bloco, prazo mais próximo.
create or replace function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_limite int default 50, p_deslocamento int default 0)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text, codigo_ibge text,
               valor_estimado numeric, encerramento_em timestamptz, modalidade_nome text,
               onde text, item_trecho text, total bigint)
language sql stable as $$
  with t as (select public.consulta(q) as tq),
  base as (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.municipio_nome, u.uf, u.codigo_ibge, u.valor_estimado,
           u.encerramento_em, u.modalidade_nome,
           case when t.tq is null or u.busca @@ t.tq then 'objeto' else 'itens' end as onde_,
           t.tq
    from public.abertas_unicas(q, p_ufs) u, t
    where (p_ibge is null or u.codigo_ibge = p_ibge)
      and (p_dias is null or u.encerramento_em <= now() + make_interval(days => p_dias))
  ),
  -- Corta a página antes de procurar o trecho do item (só para as linhas que vão sair).
  pagina as (
    select b.*, count(*) over () as total_
    from base b
    order by (b.onde_ = 'itens'), b.encerramento_em, b.id
    limit p_limite offset p_deslocamento
  )
  select p.id, p.slug, p.objeto, p.orgao_nome, p.municipio_nome, p.uf, p.codigo_ibge, p.valor_estimado,
         p.encerramento_em, p.modalidade_nome, p.onde_,
         case when p.onde_ = 'itens' then (
           select i.descricao from public.itens i
           where i.contratacao_id = p.id and i.busca @@ p.tq order by i.numero limit 1) end,
         p.total_
  from pagina p
  order by (p.onde_ = 'itens'), p.encerramento_em, p.id
$$;

-- Mapa: um ponto por município sobre as abertas sem duplicadas (ordenado para paginar de forma estável).
create or replace function public.mapa_editais(q text default null, p_ufs text[] default null, p_dias int default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(u.valor_estimado, 0)), min(u.encerramento_em)
  from public.abertas_unicas(q, p_ufs) u
  join public.municipios m on m.codigo_ibge = u.codigo_ibge
  where (p_dias is null or u.encerramento_em <= now() + make_interval(days => p_dias))
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
  order by m.codigo_ibge
$$;

-- Medição do portão (só o servidor grava e lê: RLS ligado, sem políticas)
create table public.pedidos_alerta (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  termos     text[] not null,
  ufs        text[] not null default '{}',
  visitante  uuid,
  interno    boolean not null default false,
  ip_hash    text,
  criado_em  timestamptz not null default now()
);

create table public.eventos (
  id         bigint generated always as identity primary key,
  visitante  uuid not null,
  tipo       text not null check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso')),
  detalhe    jsonb not null default '{}',
  interno    boolean not null default false,
  ip_hash    text,
  criado_em  timestamptz not null default now()
);

create index eventos_ip_idx on public.eventos (ip_hash, criado_em);
create index eventos_tipo_idx on public.eventos (tipo, criado_em);
create index pedidos_alerta_ip_idx on public.pedidos_alerta (ip_hash, criado_em);

alter table public.pedidos_alerta enable row level security;
alter table public.eventos enable row level security;

revoke execute on function public.objeto_normalizado(text) from public, anon, authenticated;
revoke execute on function public.abertas_unicas(text, text[]) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, int, int) from public, anon, authenticated;
revoke execute on function public.mapa_editais(text, text[], int) from public, anon, authenticated;
