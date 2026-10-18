-- Edital Map · Evolução · Fase 2 · Busca, relevância e situação: conferências do controlador (0011).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez; anotar em docs/fase-3-metricas.md.
-- Os arrays <...> vêm de `npx tsx scripts/conferir-relevancia.ts --mostrar` (copiar e colar).

-- ── [E0] ANTES da 0011: abertas por situação e totais de hoje (anotar para comparar com [E3]).
select situacao_id, situacao_nome, count(*) as abertas
from public.contratacoes where encerramento_em > now()
group by 1, 2 order by 1;
select (select max(total) from public.buscar_editais(p_limite => 1)) as lista,
       (select sum(qtd) from public.mapa_editais()) as mapa,
       (select max(total) from public.buscar_editais(q => 'uniforme', p_limite => 1)) as lista_uniforme;
-- Tempo de hoje com termo amplo (anotar "Execution Time"; é a régua da meta "como hoje").
explain (analyze, buffers) select * from public.buscar_editais(q => 'material');

-- ── [E1] Depois: permissões. Esperado: anon e autenticado false, servico true, nas 12 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array[
  'public.em_aberto(timestamptz, int)',
  'public.termos_da_busca(text, text[])',
  'public.consulta_termos(text[])',
  'public.consulta_frase(text)',
  'public.pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int)',
  'public.acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[])',
  'public.abertas(text, text[], numeric)',
  'public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int)',
  'public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text)',
  'public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[])',
  'public.orgaos_abertos(text, int)',
  'public.relacionados(text, int)']) as f;

-- ── [E2] Uma assinatura por função. Esperado: 3 linhas; buscar_editais termina em p_ordem, mapa_editais em p_excluir,
-- abertas_unicas começa em p_tq.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname in ('abertas_unicas', 'buscar_editais', 'mapa_editais')
order by 1;

-- ── [E3] Revogadas e anuladas fora em todas as funções; suspensas dentro.
-- Esperado: revogadas_anuladas = 0; suspensas ≈ situação 4 de [E0]; lista ≈ [E0] lista menos (2 + 3) de [E0].
select count(*) filter (where situacao_id in (2, 3)) as revogadas_anuladas,
       count(*) filter (where situacao_id = 4) as suspensas,
       max(total) as lista
from public.buscar_editais(p_limite => 100000, p_ordem => 'prazo');
-- Lista = mapa + editais sem município conhecido (o mapa só desenha quem tem município). Esperado: diferenca = 0.
select l.total - m.soma - s.sem_municipio as diferenca, l.total, m.soma, s.sem_municipio
from (select max(total) as total from public.buscar_editais(p_limite => 1)) l,
     (select sum(qtd) as soma from public.mapa_editais()) m,
     (select count(*) as sem_municipio from public.abertas_unicas(null, null) u
       where not exists (select 1 from public.municipios x where x.codigo_ibge = u.codigo_ibge)) s;
-- As quatro funções que listam abertas usam em_aberto. Esperado: 4 linhas.
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('abertas', 'abertas_unicas', 'orgaos_abertos', 'relacionados') and prosrc like '%em_aberto(%';
-- Órgãos: trocar <cnpj> pelo primeiro de orgaos_abertos('prefeitura', 1). Esperado: qtd = total.
select * from public.orgaos_abertos('prefeitura', 1);
select max(total) as total from public.buscar_editais(p_orgao => '<cnpj>', p_limite => 1);
-- Parecidos de 30 editais abertos ao acaso: nenhum revogado ou anulado. Esperado: 0.
select count(*) as parecidos_fora
from (select id from public.contratacoes where public.em_aberto(encerramento_em, situacao_id) order by random() limit 30) o
cross join lateral public.relacionados(o.id) r
join public.contratacoes x on x.id = r.id
where x.situacao_id in (2, 3);

-- ── [E4] Relacionados e excluídos ("uniformes", arrays de --mostrar).
-- Esperado: so_digitado <= com_relacionados; sem_escolar <= com_relacionados; escolar_restante = 0.
select (select max(total) from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_limite => 1)) as so_digitado,
       (select max(total) from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}',
          p_relacionados => '<relacionados de uniformes>', p_limite => 1)) as com_relacionados,
       (select max(total) from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}',
          p_relacionados => '<relacionados de uniformes>', p_excluir => '{escolar}', p_limite => 1)) as sem_escolar;
select count(*) as escolar_restante
from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_relacionados => '<relacionados de uniformes>',
                           p_excluir => '{escolar}', p_limite => 100000, p_ordem => 'prazo') b
join public.contratacoes c on c.id = b.id
where c.busca @@ public.consulta('escolar');
-- Mapa com os mesmos termos. Esperado: diferenca = 0.
select l.total - m.soma - s.sem_municipio as diferenca
from (select max(total) as total from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}',
        p_relacionados => '<relacionados de uniformes>', p_limite => 1)) l,
     (select sum(qtd) as soma from public.mapa_editais(q => 'uniformes', p_termos => '{uniformes}',
        p_relacionados => '<relacionados de uniformes>')) m,
     (select count(*) as sem_municipio
        from public.abertas_unicas(public.consulta_termos('{uniformes}'::text[] || '<relacionados de uniformes>'::text[]), null) u
       where not exists (select 1 from public.municipios x where x.codigo_ibge = u.codigo_ibge)) s;
-- As 10 primeiras por relevância: anotar 3 (objeto, pontuação, termos) para conferir o card no site (Task 12).
select left(objeto, 80) as objeto, pontuacao, termos_objeto, termos_itens, frase
from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_relacionados => '<relacionados de uniformes>', p_limite => 10);
-- Ordens: valor não informado no fim e nada subindo fora de ordem. Esperado: as duas contagens = 0.
with v as (select ordinality as i, nullif(valor_estimado, 0) as valor
           from public.buscar_editais(p_ordem => 'maior_valor', p_limite => 500) with ordinality)
select count(*) filter (where a.valor is null and b.valor is not null) as nulo_antes_de_valor,
       count(*) filter (where a.valor < b.valor) as subiu
from v a join v b on b.i = a.i + 1;

-- ── [E5] Tempos (meta: Execution Time < 500 ms; rodar cada um duas vezes e anotar a segunda).
explain (analyze, buffers) select * from public.buscar_editais(q => 'material', p_termos => '{material}', p_limite => 20, p_ordem => 'relevancia');
explain (analyze, buffers) select * from public.buscar_editais(q => 'material', p_termos => '{material}', p_limite => 20, p_ordem => 'prazo');
explain (analyze, buffers) select * from public.buscar_editais(q => 'EPI', p_termos => '{EPI}', p_relacionados => '<relacionados de EPI>', p_limite => 20);
explain (analyze, buffers) select * from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_relacionados => '<relacionados de uniformes>', p_limite => 20);
explain (analyze, buffers) select * from public.buscar_editais(p_limite => 20);
explain (analyze, buffers) select * from public.buscar_editais(p_limite => 20, p_ordem => 'maior_valor');
explain (analyze, buffers) select * from public.mapa_editais(q => 'EPI', p_termos => '{EPI}', p_relacionados => '<relacionados de EPI>');
explain (analyze, buffers) select * from public.mapa_editais();
-- Contagem do "Ver N editais" (ordem prazo, sem relevância de tudo):
explain (analyze) select max(total) from public.buscar_editais(q => 'EPI', p_termos => '{EPI}', p_relacionados => '<relacionados de EPI>', p_limite => 20, p_ordem => 'prazo');
-- Passou de 500 ms com relevância? Ver "Riscos" no plano antes de publicar.

-- ── [E6] Termos relacionados no banco: quantas abertas cada um acha e 2 exemplos (procurar falsos positivos).
-- Pode levar até 1 min. Rodar com os termos de um grupo por vez (--mostrar imprime por grupo).
select t.termo, count(c.id) as abertas, (array_agg(left(c.objeto, 70) order by c.encerramento_em))[1:2] as exemplos
from unnest('<termos de um grupo>'::text[]) as t(termo)
cross join lateral (select public.consulta(t.termo) as tq offset 0) k
left join public.contratacoes c on public.em_aberto(c.encerramento_em, c.situacao_id) and c.busca @@ k.tq
group by t.termo
order by 2 desc;
