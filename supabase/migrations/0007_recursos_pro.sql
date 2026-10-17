-- Edital Map · Fase 3 · Recursos Pro: editais parecidos (relacionados), filtro por órgão (orgaos_abertos e p_orgao),
-- filtro por raio em km (municipios_no_raio e p_raio_km) e o evento usou_recurso.
-- Os parâmetros novos têm padrão nulo e as assinaturas antigas saem nesta mesma transação: o site no ar, que chama
-- buscar_editais e mapa_editais sem eles, continua funcionando logo depois (e o PostgREST não fica com duas candidatas).
-- Ordem: esta migração → conferências (docs/fase-3-recursos-pro.sql) → vercel deploy --prod.
-- Aplicar com npm run db:aplicar (uma transação só).
--
-- ATENÇÃO: a regra de duplicada (mesmo município, prazo, valor e objeto normalizado; fica a que tem link de origem,
-- depois a atualizada por último, depois o menor id) existe em três lugares: abertas_unicas, orgaos_abertos, relacionados.
-- Se mudar em um, mude nos três (e crie migration nova).

set local lock_timeout = '10s';

-- Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int);
drop function public.mapa_editais(text, text[], int, numeric, int[]);
drop function public.abertas_unicas(text, text[], numeric, int[]);

-- Abertas sem duplicadas, agora também por órgão (contratacoes.cnpj, o CNPJ do órgão comprador).
-- O órgão filtra antes de tirar as duplicadas: a cópia que fica é sempre a do órgão escolhido.
-- Fica a que tem link de origem; empate → atualizada por último; empate → menor id.
create function public.abertas_unicas(q text, p_ufs text[] default null, p_valor_min numeric default null,
                                      p_modalidades int[] default null, p_orgao text default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto)) a.*
  from public.abertas(q, p_ufs, p_valor_min) a
  where (p_modalidades is null or cardinality(p_modalidades) = 0 or a.modalidade_id = any(p_modalidades))
    and (p_orgao is null or a.cnpj = p_orgao)
  order by a.codigo_ibge, a.encerramento_em, a.valor_estimado, public.objeto_normalizado(a.objeto),
           (a.link_origem is null), a.atualizada_pncp_em desc, a.id
$$;

-- Municípios cuja sede está a até p_raio_km km da sede de p_ibge, inclusive ele mesmo
-- (haversine sobre municipios.lat/lng, raio da Terra 6.371 km; a mesma conta de lib/geo.ts).
create function public.municipios_no_raio(p_ibge text, p_raio_km int)
returns setof text language sql stable as $$
  select m.codigo_ibge
  from public.municipios c
  cross join public.municipios m
  where c.codigo_ibge = p_ibge
    and 2 * 6371 * asin(least(1, sqrt(
          power(sin(radians(m.lat - c.lat) / 2), 2)
          + cos(radians(c.lat)) * cos(radians(m.lat)) * power(sin(radians(m.lng - c.lng) / 2), 2)))) <= p_raio_km
$$;

-- Lista: bloco objeto, depois bloco itens; dentro de cada bloco, prazo mais próximo.
-- Município: só ele; com p_raio_km, todos cuja sede está dentro do raio. Devolve também link_origem (planilha).
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, link_origem text, onde text, total bigint)
language sql stable as $$
  with t as (select public.consulta(q) as tq),
  base as (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
           u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
           case when t.tq is null or u.busca @@ t.tq then 'objeto' else 'itens' end as onde_
    from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades, p_orgao) u, t
    where (p_ibge is null
           or (p_raio_km is null and u.codigo_ibge = p_ibge)
           or (p_raio_km is not null and u.codigo_ibge in (select public.municipios_no_raio(p_ibge, p_raio_km))))
      -- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
      and (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  )
  select b.id, b.slug, b.objeto, b.orgao_nome, b.unidade_nome, b.municipio_nome, b.uf, b.codigo_ibge,
         b.valor_estimado, b.encerramento_em, b.publicada_em, b.modalidade_nome, b.srp, b.link_origem, b.onde_,
         count(*) over ()
  from base b
  order by (b.onde_ = 'itens'), b.encerramento_em, b.id
  limit p_limite offset p_deslocamento
$$;

-- Mapa: um ponto por município sobre as abertas sem duplicadas. Mesma regra de município da lista
-- (o site só manda p_ibge ao mapa junto com o raio: a cidade sozinha não filtra o mapa).
create function public.mapa_editais(q text default null, p_ufs text[] default null, p_dias int default null,
                                    p_valor_min numeric default null, p_modalidades int[] default null,
                                    p_orgao text default null, p_ibge text default null, p_raio_km int default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(u.valor_estimado, 0)), min(u.encerramento_em)
  from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades, p_orgao) u
  join public.municipios m on m.codigo_ibge = u.codigo_ibge
  where (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
    and (p_ibge is null
         or (p_raio_km is null and u.codigo_ibge = p_ibge)
         or (p_raio_km is not null and u.codigo_ibge in (select public.municipios_no_raio(p_ibge, p_raio_km))))
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
  order by m.codigo_ibge
$$;

-- Órgãos com editais abertos (sem duplicadas) cujo nome contém o termo, sem acento e sem diferença de maiúsculas.
-- O site limpa o termo antes (3+ letras, sem % _ \, até 60 caracteres). Mais editais primeiro.
-- O CNPJ abre o distinct on: a duplicada é tirada dentro de cada órgão, como em abertas_unicas(p_orgao => cnpj),
-- e a contagem daqui bate com o total da lista filtrada por esse órgão.
create function public.orgaos_abertos(q text, p_limite int default 20)
returns table (cnpj text, nome text, uf text, qtd bigint)
language sql stable as $$
  with achadas as (
    select distinct on (c.cnpj, c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto))
           c.cnpj, c.orgao_nome, c.uf
    from public.contratacoes c
    where c.encerramento_em > now()
      and public.sem_acento(c.orgao_nome) ilike '%' || public.sem_acento(q) || '%'
    order by c.cnpj, c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto),
             (c.link_origem is null), c.atualizada_pncp_em desc, c.id
  )
  select a.cnpj, max(a.orgao_nome), mode() within group (order by a.uf), count(*)
  from achadas a
  group by a.cnpj
  order by count(*) desc, max(a.orgao_nome), a.cnpj
  limit p_limite
$$;

-- Editais parecidos abertos. As palavras do objeto do edital (peso A de busca; as 16 primeiras na ordem do texto,
-- com 3+ caracteres, sem número puro e sem as palavras de abertura burocrática) viram uma busca "qualquer uma delas".
-- Relevância = ts_rank no objeto + 0,3 × ts_rank nas palavras dos itens, em dobro no mesmo UF; empate → prazo mais
-- próximo. Sem o próprio edital, sem as cópias dele e sem duplicadas (mesma regra de abertas_unicas).
create function public.relacionados(p_id text, p_limite int default 6)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, publicada_em timestamptz, modalidade_nome text, srp boolean)
language sql stable as $$
  with genericas as (
    select tsvector_to_array(to_tsvector('portuguese',
      'contratacao contratar empresa empresas especializada especializado aquisicao aquisicoes registro precos preco '
      || 'futura futuras eventual eventuais fornecimento fornecer servico servicos prestacao objeto municipio municipal '
      || 'secretaria atender atendimento necessidade necessidades conforme termo referencia edital anexo lote lotes '
      || 'item itens quantidade quantidades demanda destinado destinada destinados destinadas visando material '
      || 'materiais diversos diversas geral gerais unidade unidades publica publico estadual federal especificacoes '
      || 'condicoes estabelecidas constantes parcelada parcelado entrega tipo')) as lexemas
  ),
  origem as (
    select c.id, c.uf, c.codigo_ibge, c.encerramento_em, c.valor_estimado,
           public.objeto_normalizado(c.objeto) as objeto_norm,
           (select string_agg(p.lexeme, ' | ')::tsquery
              from (select u.lexeme
                      from unnest(ts_filter(c.busca, '{a}')) u, genericas g
                     where u.lexeme ~ '^[a-z0-9]{3,}$'
                       and u.lexeme !~ '^[0-9]+$'
                       and u.lexeme <> all (g.lexemas)
                     order by u.positions[1]
                     limit 16) p) as tq
    from public.contratacoes c
    where c.id = p_id
  ),
  candidatas as (
    select a.*,
           (ts_rank(a.busca, o.tq) + 0.3 * ts_rank(coalesce(a.itens_palavras, ''::tsvector), o.tq))
             * (case when a.uf = o.uf then 2 else 1 end) as relevancia
    from origem o
    join public.contratacoes a
      on a.encerramento_em > now()
     and (a.busca @@ o.tq or a.itens_palavras @@ o.tq)
    where o.tq is not null
      and a.id <> o.id
      -- Cópia do próprio edital (mesma regra de duplicada de abertas_unicas) também não conta.
      and not (a.codigo_ibge is not distinct from o.codigo_ibge
               and a.encerramento_em = o.encerramento_em
               and a.valor_estimado is not distinct from o.valor_estimado
               and public.objeto_normalizado(a.objeto) = o.objeto_norm)
  ),
  unicas as (
    select distinct on (k.codigo_ibge, k.encerramento_em, k.valor_estimado, public.objeto_normalizado(k.objeto)) k.*
    from candidatas k
    order by k.codigo_ibge, k.encerramento_em, k.valor_estimado, public.objeto_normalizado(k.objeto),
             (k.link_origem is null), k.atualizada_pncp_em desc, k.id
  )
  select x.id, x.slug, x.objeto, x.orgao_nome, x.municipio_nome, x.uf, x.valor_estimado, x.encerramento_em,
         x.publicada_em, x.modalidade_nome, x.srp
  from unicas x
  order by x.relevancia desc, x.encerramento_em, x.id
  limit p_limite
$$;

-- Evento novo: usou_recurso (relacionados_clique, filtro_orgao, filtro_raio, exportou).
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso'));

-- Só o servidor (service_role) executa.
revoke execute on function public.abertas_unicas(text, text[], numeric, int[], text) from public, anon, authenticated;
revoke execute on function public.municipios_no_raio(text, int) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int) from public, anon, authenticated;
revoke execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int) from public, anon, authenticated;
revoke execute on function public.orgaos_abertos(text, int) from public, anon, authenticated;
revoke execute on function public.relacionados(text, int) from public, anon, authenticated;
grant execute on function public.abertas_unicas(text, text[], numeric, int[], text) to service_role;
grant execute on function public.municipios_no_raio(text, int) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int) to service_role;
grant execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int) to service_role;
grant execute on function public.orgaos_abertos(text, int) to service_role;
grant execute on function public.relacionados(text, int) to service_role;

-- O PostgREST relê as funções no commit (o Supabase também relê sozinho depois de DDL; aqui fica explícito).
notify pgrst, 'reload schema';
