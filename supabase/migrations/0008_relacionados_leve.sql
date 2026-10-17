-- Edital Map · Recursos Pro: relacionados mais leve e mais preciso (a 0007 passou de 300 ms no explain analyze
-- e trazia editais sem relação por causa das palavras dos itens e de palavras genéricas como "outros").
-- Mesma assinatura e mesmas colunas da 0007; muda só o corpo:
--   1. A busca da origem é montada uma vez (CTE materializada), não de novo para cada candidata.
--   2. No máximo 8 palavras do objeto (peso A, na ordem do texto, 3+ caracteres, sem número puro, sem genéricas).
--   3. Candidatas só pelo objeto (palavra:A, índice GIN de busca); as palavras dos itens só pesam na relevância.
--   4. Ordena pela relevância, fica com as 60 primeiras e só então tira as cópias da origem e as duplicadas
--      (objeto_normalizado roda em no máximo 60 linhas).
-- Regra de duplicada igual à de abertas_unicas (0007): mesmo município, prazo, valor e objeto normalizado; fica a que
-- tem link de origem, depois a atualizada por último, depois o menor id.
-- Aplicar com npm run db:aplicar (uma transação só).

set local lock_timeout = '10s';

create or replace function public.relacionados(p_id text, p_limite int default 6)
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
      || 'condicoes estabelecidas constantes parcelada parcelado entrega tipo '
      || 'outros outras outro outra demais kit kits conjunto conjuntos utilizacao utilizar')) as lexemas
  ),
  palavras as (
    select c.id, c.uf, c.codigo_ibge, c.encerramento_em, c.valor_estimado,
           public.objeto_normalizado(c.objeto) as objeto_norm,
           (select array_agg(p.lexeme order by p.pos)
              from (select u.lexeme, u.positions[1] as pos
                      from unnest(ts_filter(c.busca, '{a}')) u, genericas g
                     where u.lexeme ~ '^[a-z0-9]{3,}$'
                       and u.lexeme !~ '^[0-9]+$'
                       and u.lexeme <> all (g.lexemas)
                     order by u.positions[1], u.lexeme
                     limit 8) p) as lexemas
    from public.contratacoes c
    where c.id = p_id
  ),
  -- Uma linha, calculada uma vez. tq: "qualquer uma das palavras" só no objeto (peso A);
  -- tq_itens: as mesmas palavras sem peso, para itens_palavras (que não guarda peso).
  origem as materialized (
    select w.id, w.uf, w.codigo_ibge, w.encerramento_em, w.valor_estimado, w.objeto_norm,
           (array_to_string(w.lexemas, ':A | ') || ':A')::tsquery as tq,
           array_to_string(w.lexemas, ' | ')::tsquery as tq_itens
    from palavras w
    where cardinality(w.lexemas) > 0
  ),
  -- Relevância = ts_rank no objeto + 0,3 × ts_rank nas palavras dos itens, em dobro no mesmo UF.
  -- As 60 mais relevantes (empate → prazo mais próximo, depois id) seguem para tirar cópias e duplicadas.
  candidatas as (
    select a.id, a.slug, a.objeto, a.orgao_nome, a.municipio_nome, a.uf, a.valor_estimado, a.encerramento_em,
           a.publicada_em, a.modalidade_nome, a.srp, a.codigo_ibge, a.link_origem, a.atualizada_pncp_em,
           (ts_rank(a.busca, o.tq) + 0.3 * ts_rank(coalesce(a.itens_palavras, ''::tsvector), o.tq_itens))
             * (case when a.uf = o.uf then 2 else 1 end) as relevancia
    from origem o
    cross join public.contratacoes a
    where a.busca @@ o.tq
      and a.encerramento_em > now()
      and a.id <> o.id
    order by relevancia desc, a.encerramento_em, a.id
    limit 60
  ),
  normalizadas as (
    select k.*, public.objeto_normalizado(k.objeto) as objeto_norm
    from candidatas k
  ),
  unicas as (
    select distinct on (n.codigo_ibge, n.encerramento_em, n.valor_estimado, n.objeto_norm) n.*
    from normalizadas n
    cross join origem o
    -- Cópia do próprio edital (mesma regra de duplicada de abertas_unicas) também não conta.
    where not (n.codigo_ibge is not distinct from o.codigo_ibge
               and n.encerramento_em = o.encerramento_em
               and n.valor_estimado is not distinct from o.valor_estimado
               and n.objeto_norm = o.objeto_norm)
    order by n.codigo_ibge, n.encerramento_em, n.valor_estimado, n.objeto_norm,
             (n.link_origem is null), n.atualizada_pncp_em desc, n.id
  )
  select x.id, x.slug, x.objeto, x.orgao_nome, x.municipio_nome, x.uf, x.valor_estimado, x.encerramento_em,
         x.publicada_em, x.modalidade_nome, x.srp
  from unicas x
  order by x.relevancia desc, x.encerramento_em, x.id
  limit p_limite
$$;

-- Só o servidor (service_role) executa.
revoke execute on function public.relacionados(text, int) from public, anon, authenticated;
grant execute on function public.relacionados(text, int) to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
