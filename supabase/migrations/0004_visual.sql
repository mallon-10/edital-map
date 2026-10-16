-- Edital Map · Fase 2 · Visual: filtros de valor e modalidade, mais campos na busca,
-- benefício ME/EPP e critério de julgamento nos itens, resumo dos itens do edital.

alter table public.itens
  add column beneficio_id int,
  add column beneficio_nome text,
  add column criterio_julgamento text;

-- Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function if exists public.buscar_editais(text, text[], text, int, int, int);
drop function if exists public.mapa_editais(text, text[], int);
drop function if exists public.abertas_unicas(text, text[]);

-- Abertas sem duplicadas, agora com valor mínimo e modalidades.
-- Fica a que tem link de origem; empate → atualizada por último; empate → menor id.
create function public.abertas_unicas(q text, p_ufs text[] default null, p_valor_min numeric default null,
                                      p_modalidades int[] default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto)) a.*
  from public.abertas(q, p_ufs, p_valor_min) a
  where (p_modalidades is null or cardinality(p_modalidades) = 0 or a.modalidade_id = any(p_modalidades))
  order by a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto),
           (a.link_origem is null), a.atualizada_pncp_em desc, a.id
$$;

-- Lista: bloco objeto, depois bloco itens; dentro de cada bloco, prazo mais próximo.
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, onde text, item_trecho text, total bigint)
language sql stable as $$
  with t as (select public.consulta(q) as tq),
  base as (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
           u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp,
           case when t.tq is null or u.busca @@ t.tq then 'objeto' else 'itens' end as onde_,
           t.tq
    from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades) u, t
    where (p_ibge is null or u.codigo_ibge = p_ibge)
      -- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
      and (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  ),
  -- Corta a página antes de procurar o trecho do item (só para as linhas que vão sair).
  pagina as (
    select b.*, count(*) over () as total_
    from base b
    order by (b.onde_ = 'itens'), b.encerramento_em, b.id
    limit p_limite offset p_deslocamento
  )
  select p.id, p.slug, p.objeto, p.orgao_nome, p.unidade_nome, p.municipio_nome, p.uf, p.codigo_ibge,
         p.valor_estimado, p.encerramento_em, p.publicada_em, p.modalidade_nome, p.srp, p.onde_,
         case when p.onde_ = 'itens' then (
           select i.descricao from public.itens i
           where i.contratacao_id = p.id and i.busca @@ p.tq order by i.numero limit 1) end,
         p.total_
  from pagina p
  order by (p.onde_ = 'itens'), p.encerramento_em, p.id
$$;

-- Mapa: um ponto por município sobre as abertas sem duplicadas (ordenado para paginar de forma estável).
create function public.mapa_editais(q text default null, p_ufs text[] default null, p_dias int default null,
                                    p_valor_min numeric default null, p_modalidades int[] default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(u.valor_estimado, 0)), min(u.encerramento_em)
  from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades) u
  join public.municipios m on m.codigo_ibge = u.codigo_ibge
  where (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
  order by m.codigo_ibge
$$;

-- Resumo dos itens de um edital: tipos, ME/EPP (1 = exclusiva, 3 = cota reservada) e critérios.
create function public.resumo_itens(p_contratacao text)
returns table (total bigint, materiais bigint, servicos bigint, com_beneficio bigint, exclusivos bigint, cota bigint,
               criterios text[])
language sql stable as $$
  select count(*),
         count(*) filter (where material_ou_servico = 'M'),
         count(*) filter (where material_ou_servico = 'S'),
         count(*) filter (where beneficio_id is not null),
         count(*) filter (where beneficio_id = 1),
         count(*) filter (where beneficio_id = 3),
         coalesce(array_agg(distinct criterio_julgamento) filter (where criterio_julgamento is not null), '{}')
  from public.itens
  where contratacao_id = p_contratacao
$$;

revoke execute on function public.abertas_unicas(text, text[], numeric, int[]) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int) from public, anon, authenticated;
revoke execute on function public.mapa_editais(text, text[], int, numeric, int[]) from public, anon, authenticated;
revoke execute on function public.resumo_itens(text) from public, anon, authenticated;
