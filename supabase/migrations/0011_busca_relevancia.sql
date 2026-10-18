-- Edital Map · Evolução · Fase 2 · Busca, relevância, lista e edital (0011).
-- 1. Aberta = prazo (encerramento_em) no futuro e situação diferente de Revogada (2) e Anulada (3), num lugar só:
--    public.em_aberto (a guarda confere que só ela compara o prazo com o agora).
--    Vale em abertas (worker/conferir), abertas_unicas (lista, mapa, contagem e exportação), orgaos_abertos e
--    relacionados. Suspensa (4) continua aberta (o site mostra a etiqueta).
-- 2. buscar_editais com os termos digitados (p_termos), os relacionados (p_relacionados), os excluídos (p_excluir) e a
--    ordem (p_ordem); devolve situacao_id, pontuacao (0–100) e o que bateu (termos_objeto, termos_itens, frase).
-- 3. mapa_editais com os mesmos termos e a mesma abertas_unicas: lista, mapa, painel e exportação contam os mesmos editais.
-- Os parâmetros novos têm padrão nulo e as assinaturas antigas saem nesta mesma transação: o site no ar (que chama
-- buscar_editais e mapa_editais sem eles) continua funcionando logo depois, já sem revogadas e anuladas.
-- Os pesos de pontuacao_busca e as ordens são os de lib/relevancia/pontuacao.ts e lib/filtros.ts (guarda em
-- scripts/migracoes.test.ts). Regra de duplicada igual à da 0007, em abertas_unicas, orgaos_abertos e relacionados.
-- Ordem: esta migração → conferências (docs/evolucao-fase-2.sql, npx tsx scripts/conferir-relevancia.ts) → vercel deploy --prod.
-- Aplicar com npm run db:aplicar (uma transação só).

set local lock_timeout = '10s';

-- Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int);
drop function public.mapa_editais(text, text[], int, numeric, int[], text, text, int);
drop function public.abertas_unicas(text, text[], numeric, int[], text);

-- Aberta: prazo no futuro e situação que não é Revogada (2) nem Anulada (3). SQL simples: o planejador expande no
-- lugar da chamada (o índice de encerramento continua valendo).
create function public.em_aberto(p_encerramento timestamptz, p_situacao int)
returns boolean language sql stable parallel safe as $$
  select p_encerramento > now() and coalesce(p_situacao, 0) not in (2, 3)
$$;

-- Termos da busca: os já separados pelo site (p_termos) ou, na chamada antiga, o texto inteiro (consulta separa).
create function public.termos_da_busca(q text, p_termos text[])
returns text[] language sql immutable parallel safe as $$
  select coalesce(p_termos, case when coalesce(trim(q), '') = '' then '{}'::text[] else array[q] end)
$$;

-- Vários termos → "qualquer um deles", pelas regras de public.consulta (prefixo, sem acento). Nenhum → null.
create function public.consulta_termos(p_termos text[])
returns tsquery language sql immutable parallel safe as $$
  select case when coalesce(cardinality(p_termos), 0) = 0 then null
              else public.consulta(array_to_string(p_termos, ', ')) end
$$;

-- Expressão inteira: as palavras do termo (2+ caracteres, por prefixo) em sequência. Uma palavra: ela mesma.
-- Só palavras vazias ("de") → null (to_tsquery sem lexema não acharia nada e avisaria a cada linha).
create function public.consulta_frase(p_termo text)
returns tsquery language sql immutable parallel safe as $$
  select case when numnode(x.tq) > 0 then x.tq end
  from (
    select case when count(*) = 0 then null
                else to_tsquery('portuguese', string_agg(w.p || ':*', ' <-> ' order by w.n)) end as tq
    from regexp_split_to_table(lower(public.sem_acento(coalesce(p_termo, ''))), '[^a-z0-9]+') with ordinality as w(p, n)
    where length(w.p) >= 2
  ) x
$$;

-- Pontuação 0–100 (os pesos de PESOS em lib/relevancia/pontuacao.ts): o melhor tipo de acerto (digitado no objeto 60,
-- só nos itens 35; relacionado no objeto 45, só nos itens 25), mais 15 pela expressão inteira, mais 5 por termo
-- distinto além do primeiro (até 3), com teto 100.
create function public.pontuacao_busca(p_digitado_objeto boolean, p_digitado_itens boolean, p_relacionado_objeto boolean,
                                       p_relacionado_itens boolean, p_frase boolean, p_distintos int)
returns int language sql immutable parallel safe as $$
  select least(100,
    greatest(case when p_digitado_objeto then 60 else 0 end,
             case when p_digitado_itens then 35 else 0 end,
             case when p_relacionado_objeto then 45 else 0 end,
             case when p_relacionado_itens then 25 else 0 end)
    + case when p_frase then 15 else 0 end
    + 5 * least(3, greatest(0, coalesce(p_distintos, 0) - 1)))
$$;

-- O que bateu num edital: termos no objeto (coluna busca: objeto e informação complementar), termos só nos itens
-- (itens_palavras, sem os que já estão no objeto), se alguma expressão digitada aparece inteira, e a pontuação.
-- p_termos, p_tqs e p_frases andam juntos (mesma posição: digitados primeiro, depois relacionados).
create function public.acertos_busca(p_busca tsvector, p_itens tsvector, p_termos text[], p_tqs tsquery[],
                                     p_frases tsquery[], p_digitados text[], p_relacionados text[])
returns table (termos_objeto text[], termos_itens text[], frase boolean, pontuacao int)
language sql stable parallel safe as $$
  select m.obj, m.itens, m.frase,
         public.pontuacao_busca(m.obj && p_digitados, m.itens && p_digitados,
                                m.obj && p_relacionados, m.itens && p_relacionados,
                                m.frase, cardinality(m.obj) + cardinality(m.itens))
  from (
    select coalesce(array_agg(u.termo order by u.n) filter (where p_busca @@ u.tq), '{}'::text[]) as obj,
           coalesce(array_agg(u.termo order by u.n)
                      filter (where not coalesce(p_busca @@ u.tq, false) and p_itens @@ u.tq), '{}'::text[]) as itens,
           coalesce(bool_or(p_busca @@ u.fr), false) as frase
    from unnest(p_termos, p_tqs, p_frases) with ordinality as u(termo, tq, fr, n)
  ) m
$$;

-- Abertas que casam com a busca: no objeto/informação complementar ou nas palavras dos itens (worker/conferir usa).
create or replace function public.abertas(q text, p_ufs text[] default null, p_valor_min numeric default null)
returns setof public.contratacoes language sql stable as $$
  with t as (select public.consulta(q) as tq)
  select c.*
  from public.contratacoes c, t
  where public.em_aberto(c.encerramento_em, c.situacao_id)
    and (t.tq is null or c.busca @@ t.tq or c.itens_palavras @@ t.tq)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
$$;

-- Abertas sem duplicadas, com todos os filtros da busca: lista, mapa, contagem e exportação passam por aqui.
-- p_tq: termos digitados e relacionados ("qualquer um"), no objeto ou nas palavras dos itens; p_tq_excluir: sai quem
-- tem um termo excluído no objeto. Município: só ele; com p_raio_km, todos cuja sede está dentro do raio.
-- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
-- Duplicada (mesmo município, prazo, valor e objeto normalizado): fica a que tem link de origem; empate → atualizada
-- por último; empate → menor id. Os filtros vêm antes de tirar as duplicadas (os que dependem de município e prazo
-- usam as mesmas colunas da regra, então dá no mesmo; o do órgão faz a cópia que fica ser a do órgão escolhido).
create function public.abertas_unicas(p_tq tsquery, p_tq_excluir tsquery, p_ufs text[] default null,
                                      p_valor_min numeric default null, p_modalidades int[] default null,
                                      p_orgao text default null, p_ibge text default null, p_raio_km int default null,
                                      p_dias int default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto)) c.*
  from public.contratacoes c
  where public.em_aberto(c.encerramento_em, c.situacao_id)
    and (p_tq is null or c.busca @@ p_tq or c.itens_palavras @@ p_tq)
    and (p_tq_excluir is null or not c.busca @@ p_tq_excluir)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
    and (p_modalidades is null or cardinality(p_modalidades) = 0 or c.modalidade_id = any(p_modalidades))
    and (p_orgao is null or c.cnpj = p_orgao)
    and (p_ibge is null
         or (p_raio_km is null and c.codigo_ibge = p_ibge)
         or (p_raio_km is not null and c.codigo_ibge in (select public.municipios_no_raio(p_ibge, p_raio_km))))
    and (p_dias is null or c.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  order by c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto),
           (c.link_origem is null), c.atualizada_pncp_em desc, c.id
$$;

-- Lista. Ordens: relevancia (pontuação, depois prazo; padrão com termo), recentes (publicação mais nova), prazo
-- (encerramento mais próximo; padrão sem termo), maior_valor e menor_valor (valor não informado no fim); desempate por
-- prazo e id. Com relevância a pontuação é calculada em todas as abertas da busca (para ordenar); nas outras ordens,
-- só nas da página. Sem termo (ou termo sem palavra válida), pontuacao é nula e onde é 'objeto'.
-- plan_cache_mode: as consultas de dentro sempre planejadas com os valores (um "termo nulo" constante deixa o índice valer).
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null,
  p_termos text[] default null, p_relacionados text[] default null, p_excluir text[] default null,
  p_ordem text default null)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, link_origem text, onde text, total bigint,
               situacao_id int, pontuacao int, termos_objeto text[], termos_itens text[], frase boolean)
language plpgsql stable set plan_cache_mode = force_custom_plan as $$
#variable_conflict use_column
declare
  v_digitados text[] := public.termos_da_busca(q, p_termos);
  v_relacionados text[] := coalesce(p_relacionados, '{}'::text[]);
  v_termos text[] := v_digitados || v_relacionados;
  v_tq tsquery := public.consulta_termos(v_digitados || v_relacionados);
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
  v_tqs tsquery[];
  v_frases tsquery[];
  v_ordem text := case when p_ordem in ('relevancia', 'recentes', 'prazo', 'maior_valor', 'menor_valor') then p_ordem end;
begin
  -- Uma consulta de texto por termo, montada uma vez (a frase só para os digitados).
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  if v_tq is null then
    v_ordem := case when v_ordem is null or v_ordem = 'relevancia' then 'prazo' else v_ordem end;
  elsif v_ordem is null then
    v_ordem := 'relevancia';
  end if;

  if v_ordem = 'relevancia' then
    return query
      select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
             u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
             case when cardinality(a.termos_objeto) > 0 then 'objeto' else 'itens' end,
             count(*) over (), u.situacao_id, a.pontuacao, a.termos_objeto, a.termos_itens, a.frase
      from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias) u
      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
      order by a.pontuacao desc, u.encerramento_em, u.id
      limit p_limite offset p_deslocamento;
  else
    return query
      with pagina as (
        select u.*, count(*) over () as total_da_busca
        from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias) u
        order by case when v_ordem = 'recentes' then u.publicada_em end desc nulls last,
                 case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last,
                 case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last,
                 u.encerramento_em, u.id
        limit p_limite offset p_deslocamento
      )
      select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
             u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
             case when v_tq is null or cardinality(a.termos_objeto) > 0 then 'objeto' else 'itens' end,
             u.total_da_busca, u.situacao_id, case when v_tq is not null then a.pontuacao end,
             a.termos_objeto, a.termos_itens, a.frase
      from pagina u
      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
      order by case when v_ordem = 'recentes' then u.publicada_em end desc nulls last,
               case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last,
               case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last,
               u.encerramento_em, u.id;
  end if;
end $$;

-- Mapa: um ponto por município sobre as mesmas abertas da lista (mesmos termos, excluídos e filtros).
-- O site só manda p_ibge ao mapa junto com o raio: a cidade sozinha não filtra o mapa.
create function public.mapa_editais(q text default null, p_ufs text[] default null, p_dias int default null,
                                    p_valor_min numeric default null, p_modalidades int[] default null,
                                    p_orgao text default null, p_ibge text default null, p_raio_km int default null,
                                    p_termos text[] default null, p_relacionados text[] default null,
                                    p_excluir text[] default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  with t as materialized (
    select public.consulta_termos(public.termos_da_busca(q, p_termos) || coalesce(p_relacionados, '{}'::text[])) as tq,
           public.consulta_termos(p_excluir) as tq_excluir
  )
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(u.valor_estimado, 0)), min(u.encerramento_em)
  from t
  cross join lateral public.abertas_unicas(t.tq, t.tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias) u
  join public.municipios m on m.codigo_ibge = u.codigo_ibge
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
  order by m.codigo_ibge
$$;

-- Órgãos com editais abertos (corpo da 0007; aberta agora por em_aberto).
create or replace function public.orgaos_abertos(q text, p_limite int default 20)
returns table (cnpj text, nome text, uf text, qtd bigint)
language sql stable as $$
  with achadas as (
    select distinct on (c.cnpj, c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto))
           c.cnpj, c.orgao_nome, c.uf
    from public.contratacoes c
    where public.em_aberto(c.encerramento_em, c.situacao_id)
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

-- Editais parecidos abertos (corpo da 0008; aberta agora por em_aberto).
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
      and public.em_aberto(a.encerramento_em, a.situacao_id)
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
revoke execute on function public.em_aberto(timestamptz, int) from public, anon, authenticated;
revoke execute on function public.termos_da_busca(text, text[]) from public, anon, authenticated;
revoke execute on function public.consulta_termos(text[]) from public, anon, authenticated;
revoke execute on function public.consulta_frase(text) from public, anon, authenticated;
revoke execute on function public.pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int) from public, anon, authenticated;
revoke execute on function public.acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[]) from public, anon, authenticated;
revoke execute on function public.abertas(text, text[], numeric) from public, anon, authenticated;
revoke execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text) from public, anon, authenticated;
revoke execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[]) from public, anon, authenticated;
revoke execute on function public.orgaos_abertos(text, int) from public, anon, authenticated;
revoke execute on function public.relacionados(text, int) from public, anon, authenticated;
grant execute on function public.em_aberto(timestamptz, int) to service_role;
grant execute on function public.termos_da_busca(text, text[]) to service_role;
grant execute on function public.consulta_termos(text[]) to service_role;
grant execute on function public.consulta_frase(text) to service_role;
grant execute on function public.pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int) to service_role;
grant execute on function public.acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[]) to service_role;
grant execute on function public.abertas(text, text[], numeric) to service_role;
grant execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text) to service_role;
grant execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[]) to service_role;
grant execute on function public.orgaos_abertos(text, int) to service_role;
grant execute on function public.relacionados(text, int) to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
