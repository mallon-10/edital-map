-- Edital Map · Fase 3 · Brasil todo · M1: os itens viram palavras + resumo na própria contratação.
-- itens_palavras: os lexemas de todas as descrições dos itens, sem posições, na configuração de itens.busca.
-- itens_resumo: { total, materiais, servicos, com_beneficio, exclusivos, cota, criterios[] }.
-- A busca "achou nos itens" usa as palavras; o trecho do item que bateu deixa de existir.
-- A tabela itens continua até a 0006 (conferência antes de apagar).
-- Ordem: esta migração → merge no main (worker novo) → vercel deploy --prod → npm run worker:reler-itens.
-- Aplicar com npm run db:aplicar (uma transação só: as tabelas temporárias somem no commit).

set local statement_timeout = 0;
set local lock_timeout = '10s';

-- Preenchimento calculado antes de travar contratacoes (a trava exclusiva cobre só alter, update e índice).
-- Só a janela de retenção (encerramento nos últimos 7 dias ou depois): o resto sai na 0006, e regravar
-- linhas que vão ser apagadas só incharia o banco. As palavras são a união dos lexemas de itens.busca
-- (já sem acento e em português): o mesmo conjunto que a busca encontrava item a item.
create temp table palavras_0005 on commit drop as
  select i.contratacao_id, array_to_tsvector(array_agg(distinct u.lexeme)) as v
  from public.itens i
  join public.contratacoes c on c.id = i.contratacao_id
  cross join lateral unnest(i.busca) as u(lexeme, positions, weights)
  where c.encerramento_em > now() - interval '7 days'
  group by i.contratacao_id;

create temp table resumos_0005 on commit drop as
  select i.contratacao_id,
         jsonb_build_object(
           'total', count(*),
           'materiais', count(*) filter (where i.material_ou_servico = 'M'),
           'servicos', count(*) filter (where i.material_ou_servico = 'S'),
           'com_beneficio', count(*) filter (where i.beneficio_id is not null),
           'exclusivos', count(*) filter (where i.beneficio_id = 1),
           'cota', count(*) filter (where i.beneficio_id = 3),
           'criterios', coalesce(
             jsonb_agg(distinct i.criterio_julgamento order by i.criterio_julgamento)
               filter (where i.criterio_julgamento is not null),
             '[]'::jsonb)
         ) as r
  from public.itens i
  join public.contratacoes c on c.id = i.contratacao_id
  where c.encerramento_em > now() - interval '7 days'
  group by i.contratacao_id;

analyze palavras_0005;
analyze resumos_0005;

alter table public.contratacoes
  add column itens_palavras tsvector,
  add column itens_resumo jsonb;

-- Compra com itens e sem nenhum lexema ganha tsvector vazio (não nulo), como o worker grava.
-- now() é a hora do início da transação: a mesma janela dos dois cálculos acima.
update public.contratacoes c
   set itens_palavras = coalesce(p.v, ''::tsvector),
       itens_resumo = s.r
  from resumos_0005 s
  left join palavras_0005 p on p.contratacao_id = s.contratacao_id
 where c.id = s.contratacao_id
   and c.encerramento_em > now() - interval '7 days';

create index contratacoes_itens_palavras_idx on public.contratacoes using gin (itens_palavras);

-- O worker chama depois de ler os itens no PNCP: grava palavras + resumo sem guardar o texto das descrições.
create function public.gravar_resumo_itens(p_id text, p_palavras text, p_resumo jsonb)
returns void language sql as $$
  update public.contratacoes
     set itens_palavras = strip(to_tsvector('portuguese', public.sem_acento(coalesce(p_palavras, '')))),
         itens_resumo = p_resumo
   where id = p_id
$$;

-- Abertas que casam com a busca: no objeto/informação complementar ou nas palavras dos itens.
create or replace function public.abertas(q text, p_ufs text[] default null, p_valor_min numeric default null)
returns setof public.contratacoes language sql stable as $$
  with t as (select public.consulta(q) as tq)
  select c.*
  from public.contratacoes c, t
  where c.encerramento_em > now()
    and (t.tq is null or c.busca @@ t.tq or c.itens_palavras @@ t.tq)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
$$;

-- Lista: bloco objeto, depois bloco itens; dentro de cada bloco, prazo mais próximo. Sem o trecho do item.
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int);
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, onde text, total bigint)
language sql stable as $$
  with t as (select public.consulta(q) as tq),
  base as (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
           u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp,
           case when t.tq is null or u.busca @@ t.tq then 'objeto' else 'itens' end as onde_
    from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades) u, t
    where (p_ibge is null or u.codigo_ibge = p_ibge)
      -- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
      and (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  )
  select b.id, b.slug, b.objeto, b.orgao_nome, b.unidade_nome, b.municipio_nome, b.uf, b.codigo_ibge,
         b.valor_estimado, b.encerramento_em, b.publicada_em, b.modalidade_nome, b.srp, b.onde_,
         count(*) over ()
  from base b
  order by (b.onde_ = 'itens'), b.encerramento_em, b.id
  limit p_limite offset p_deslocamento
$$;

-- Resumo dos itens de um edital: as mesmas colunas da 0004, agora lidas de itens_resumo (sempre uma linha).
create or replace function public.resumo_itens(p_contratacao text)
returns table (total bigint, materiais bigint, servicos bigint, com_beneficio bigint, exclusivos bigint, cota bigint,
               criterios text[])
language sql stable as $$
  select coalesce((x.r ->> 'total')::bigint, 0),
         coalesce((x.r ->> 'materiais')::bigint, 0),
         coalesce((x.r ->> 'servicos')::bigint, 0),
         coalesce((x.r ->> 'com_beneficio')::bigint, 0),
         coalesce((x.r ->> 'exclusivos')::bigint, 0),
         coalesce((x.r ->> 'cota')::bigint, 0),
         case when jsonb_typeof(x.r -> 'criterios') = 'array'
              then array(select jsonb_array_elements_text(x.r -> 'criterios'))
              else '{}'::text[] end
  from (select (select c.itens_resumo from public.contratacoes c where c.id = p_contratacao) as r) x
$$;

-- Só o servidor (service_role) executa. Os grants explícitos não dependem dos privilégios padrão de quem
-- criou cada função (abertas vem da 0001 e nunca teve revoke; resumo_itens já vinha sem acesso público da 0004).
revoke execute on function public.gravar_resumo_itens(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int) from public, anon, authenticated;
revoke execute on function public.abertas(text, text[], numeric) from public, anon, authenticated;
revoke execute on function public.resumo_itens(text) from public, anon, authenticated;
grant execute on function public.gravar_resumo_itens(text, text, jsonb) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int) to service_role;
grant execute on function public.abertas(text, text[], numeric) to service_role;
grant execute on function public.resumo_itens(text) to service_role;
