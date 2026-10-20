-- Edital Map · Busca mais precisa e editais parecidos pelo assunto (20/10/2026).
-- 1. Palavra completa casa só pelo radical exato. Antes toda palavra ia por prefixo do radical, e "evento" (event:*)
--    achava "eventual", "sofá" (sof:*) achava "software", "bateria" (bat:*) achava "batata", "elétrica" achava
--    "eletrônico". Sigla ou pedaço de palavra (o dicionário não reduz: "epi", "pneu", "unifor") continua por prefixo.
-- 2. Palavras cujo radical colide com outra palavra comum ("publicidade" e "pública" = public; "areia" e "área" = are;
--    "mesa" e "mês" = mes; "colete" e "coleta"; "calçado" e "calçada"; "leite" e "leito") viram expressões típicas;
--    num termo de várias palavras, o termo inteiro passa a valer como expressão (em sequência).
-- 3. relacionados: as palavras do objeto sem o prefixo do portal ("[Portal de Compras Públicas] - ...") e sem palavras
--    de rotina ("locação, instalação, manutenção", "a presente licitação"); cada palavra pesa pela raridade entre as
--    abertas; o parecido precisa de pelo menos 2 palavras em comum; mesmo UF ganha só 20%.
-- consulta e consulta_frase mantêm a assinatura: buscar_editais, mapa_editais, radar, alertas e SEO seguem iguais.
-- Aplicar com npm run db:aplicar (uma transação só).

set local lock_timeout = '10s';

-- Palavra (sem acento, minúscula, [a-z0-9]) → pedaço de tsquery: radical exato ou prefixo.
create or replace function public.token_busca(p text)
returns text language sql immutable parallel safe as $$
  select case when length(p) <= 3 or r.lexema is null or r.lexema = p then p || ':*' else p end
  from (select (tsvector_to_array(to_tsvector('portuguese', p)))[1] as lexema) r
$$;

-- Expressão (tokens de tsquery, na ordem) → texto de tsquery: em sequência no objeto (coluna busca, pesos A e C) e,
-- com p_itens, também todas as palavras em qualquer lugar dos itens (itens_palavras, sem posição, que o banco lê como
-- peso D; sem posição, "em sequência" nunca casaria ali).
create or replace function public.texto_expressao(p_tokens text[], p_itens boolean)
returns text language sql immutable parallel safe as $$
  select '((' || string_agg(t, ' <-> ' order by n) || ')'
         || case when p_itens
                 then ' | (' || string_agg(case when t like '%:*' then t || 'D' else t || ':D' end, ' & ' order by n) || ')'
                 else '' end
         || ')'
  from unnest(p_tokens) with ordinality as x(t, n)
$$;

-- Palavra de radical ambíguo → "qualquer uma destas expressões" (palavras exatas, sem prefixo). Outra palavra → null.
-- "publicidade" só no objeto: nos itens, "serviço" e "pública" aparecem juntos em quase toda compra.
create or replace function public.consulta_ambigua(p text)
returns tsquery language sql immutable parallel safe as $$
  select to_tsquery('portuguese', string_agg(public.texto_expressao(regexp_split_to_array(f, '\s+'),
                                                                    p not in ('publicidade', 'publicidades')), ' | '))
  from unnest(case p
    when 'publicidade' then array['propaganda', 'publicitario', 'publicitaria', 'agencia de publicidade',
      'publicidade e propaganda', 'publicidade institucional', 'publicidade legal', 'servicos de publicidade',
      'campanha de publicidade']
    when 'publicidades' then array['propaganda', 'publicitario', 'publicitaria', 'agencia de publicidade']
    when 'areia' then array['areia media', 'areia fina', 'areia grossa', 'areia lavada']
    when 'areias' then array['areia media', 'areia fina', 'areia grossa', 'areia lavada']
    when 'mesa' then array['mesa de escritorio', 'mesa de reuniao', 'mesa e cadeira', 'conjunto mesa', 'mesa escolar',
      'mesa de refeitorio', 'mesa para computador', 'mesa de computador', 'mesa plastica', 'mesa de madeira']
    when 'mesas' then array['mesa de escritorio', 'mesa de reuniao', 'mesa e cadeira', 'conjunto mesa', 'mesa escolar']
    when 'colete' then array['colete refletivo', 'colete balistico', 'colete salva vidas', 'colete de seguranca',
      'colete de protecao']
    when 'coletes' then array['colete refletivo', 'colete balistico', 'colete salva vidas', 'colete de seguranca']
    when 'calcado' then array['calcado de seguranca', 'calcado ocupacional', 'calcado profissional', 'calcado escolar',
      'calcado de couro']
    when 'calcados' then array['calcado de seguranca', 'calcado ocupacional', 'calcado profissional', 'calcado escolar']
    when 'leite' then array['leite integral', 'leite em po', 'leite desnatado', 'leite pasteurizado', 'leite uht',
      'leite longa vida', 'leite de vaca', 'leite fluido']
    when 'leites' then array['leite integral', 'leite em po', 'leite desnatado', 'leite longa vida']
  end) as f
  having count(*) > 0
$$;

-- Texto do usuário -> tsquery ("epi" acha "EPIs"; "evento" não acha "eventual").
-- Vírgula, ";", " e " e " ou " separam alternativas: "EPI e uniformes" = EPI OU uniformes.
-- Dentro de uma alternativa: todas as palavras (em qualquer lugar); com palavra ambígua, em sequência no objeto.
create or replace function public.consulta(q text) returns tsquery
language plpgsql immutable as $$
declare
  grupos text[];
  g text;
  palavras text[];
  tq tsquery;
  resultado tsquery;
begin
  if coalesce(trim(q), '') = '' then return null; end if;
  grupos := regexp_split_to_array(lower(public.sem_acento(q)), '\s*[,;|]\s*|\s+(e|ou)\s+');
  foreach g in array grupos loop
    select array_agg(w order by n) into palavras
      from regexp_split_to_table(g, '[^a-z0-9]+') with ordinality as x(w, n)
     where length(w) >= 2;
    continue when palavras is null;
    if cardinality(palavras) = 1 and public.consulta_ambigua(palavras[1]) is not null then
      tq := public.consulta_ambigua(palavras[1]);
    elsif exists (select 1 from unnest(palavras) p where public.consulta_ambigua(p) is not null) then
      tq := to_tsquery('portuguese', public.texto_expressao(
              array(select public.token_busca(p) from unnest(palavras) with ordinality as y(p, n) order by n), true));
    else
      tq := to_tsquery('portuguese', (select string_agg(public.token_busca(p), ' & ' order by n)
                                        from unnest(palavras) with ordinality as y(p, n)));
    end if;
    continue when tq is null or numnode(tq) = 0;
    resultado := case when resultado is null then tq else resultado || tq end;
  end loop;
  return resultado;
end $$;

-- Expressão inteira: as palavras do termo (2+ caracteres) em sequência, pelo mesmo token da busca. Uma palavra
-- ambígua: as expressões dela. Só palavras vazias ("de") → null.
create or replace function public.consulta_frase(p_termo text)
returns tsquery language sql immutable parallel safe as $$
  select case when numnode(x.tq) > 0 then x.tq end
  from (
    select case when count(*) = 0 then null
                when count(*) = 1 and public.consulta_ambigua(min(w.p)) is not null then public.consulta_ambigua(min(w.p))
                else to_tsquery('portuguese', string_agg(public.token_busca(w.p), ' <-> ' order by w.n)) end as tq
    from regexp_split_to_table(lower(public.sem_acento(coalesce(p_termo, ''))), '[^a-z0-9]+') with ordinality as w(p, n)
    where length(w.p) >= 2
  ) x
$$;

-- Editais parecidos abertos. Mesma assinatura e colunas da 0011; regra de duplicada igual à de abertas_unicas.
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
      || 'outros outras outro outra demais kit kits conjunto conjuntos utilizacao utilizar '
      || 'portal compras presente licitacao licitatorio procedimento pregao eletronico selecao proposta vantajosa '
      || 'objetivo constitui credenciamento pessoa pessoas juridica juridicas continuado continuados continuo continuos '
      || 'locacao instalacao manutencao montagem desmontagem retirada configuracao ativacao suporte tecnico tecnica '
      || 'compreendendo incluindo inclusive incluso inclusos preventiva corretiva equipamento equipamentos acessorios '
      || 'mediante meio via regime comodato prefeitura administracao demandas fim solucao sistema necessarios '
      || 'necessario hora horas trabalhada trabalhadas mao obra operador operadores')) as lexemas
  ),
  -- Até 10 palavras do objeto (na ordem do texto, 3+ caracteres, sem número puro, sem genéricas), sem o prefixo do
  -- portal entre colchetes.
  palavras as (
    select c.id, c.uf, c.codigo_ibge, c.encerramento_em, c.valor_estimado,
           public.objeto_normalizado(c.objeto) as objeto_norm,
           (select array_agg(p.lexeme order by p.pos)
              from (select u.lexeme, u.positions[1] as pos
                      from unnest(to_tsvector('portuguese', public.sem_acento(
                             regexp_replace(coalesce(c.objeto, ''), '^\s*\[[^]]*\]\s*-?\s*', '')))) u, genericas g
                     where u.lexeme ~ '^[a-z0-9]{3,}$'
                       and u.lexeme !~ '^[0-9]+$'
                       and u.lexeme <> all (g.lexemas)
                     order by u.positions[1], u.lexeme
                     limit 10) p) as lexemas
    from public.contratacoes c
    where c.id = p_id
  ),
  -- Peso de cada palavra = raridade entre as abertas: ln(1 + linhas da tabela / (1 + abertas com a palavra no
  -- objeto)). "rastreamento" vale mais que "veicular".
  pesos as materialized (
    select l.lexema, (l.lexema || ':A')::tsquery as q,
           ln(1 + t.total / (1 + (select count(*) from public.contratacoes a
                                   where a.busca @@ (l.lexema || ':A')::tsquery
                                     and public.em_aberto(a.encerramento_em, a.situacao_id)))) as peso
    from palavras w
    cross join unnest(w.lexemas) as l(lexema)
    cross join (select greatest(1, reltuples)::numeric as total from pg_class where oid = 'public.contratacoes'::regclass) t
  ),
  origem as materialized (
    select w.id, w.uf, w.codigo_ibge, w.encerramento_em, w.valor_estimado, w.objeto_norm,
           cardinality(w.lexemas) as qtd,
           (array_to_string(w.lexemas, ':A | ') || ':A')::tsquery as tq
    from palavras w
    where cardinality(w.lexemas) > 0
  ),
  -- Relevância = soma dos pesos das palavras em comum (no objeto), mais 20% no mesmo UF.
  pontuadas as (
    select a.id, a.slug, a.objeto, a.orgao_nome, a.municipio_nome, a.uf, a.valor_estimado, a.encerramento_em,
           a.publicada_em, a.modalidade_nome, a.srp, a.codigo_ibge, a.link_origem, a.atualizada_pncp_em,
           (select count(*) from pesos p where a.busca @@ p.q) as acertos,
           (select sum(p.peso) from pesos p where a.busca @@ p.q) * (case when a.uf = o.uf then 1.2 else 1 end) as relevancia
    from origem o
    join public.contratacoes a on a.busca @@ o.tq
    where public.em_aberto(a.encerramento_em, a.situacao_id)
      and a.id <> o.id
  ),
  -- As 60 mais relevantes com pelo menos 2 palavras em comum (1, se a origem só tem uma) seguem para tirar cópias.
  candidatas as (
    select k.*
    from pontuadas k
    cross join origem o
    where k.acertos >= least(2, o.qtd)
    order by k.relevancia desc, k.encerramento_em, k.id
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
revoke execute on function public.token_busca(text) from public, anon, authenticated;
revoke execute on function public.texto_expressao(text[], boolean) from public, anon, authenticated;
revoke execute on function public.consulta_ambigua(text) from public, anon, authenticated;
revoke execute on function public.relacionados(text, int) from public, anon, authenticated;
grant execute on function public.token_busca(text) to service_role;
grant execute on function public.texto_expressao(text[], boolean) to service_role;
grant execute on function public.consulta_ambigua(text) to service_role;
grant execute on function public.relacionados(text, int) to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
