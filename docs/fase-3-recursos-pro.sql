-- Edital Map · Fase 3 · Recursos Pro: conferências do controlador (0007).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez.

-- ── [P0] Antes da 0007: nome da restrição de tipo de eventos. Esperado: eventos_tipo_check.
select conname from pg_constraint where conrelid = 'public.eventos'::regclass and contype = 'c';

-- ── [P1] Depois da 0007: permissões. Esperado: anon e autenticado false, servico true, nas 6 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array[
  'public.abertas_unicas(text, text[], numeric, int[], text)',
  'public.municipios_no_raio(text, int)',
  'public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int)',
  'public.mapa_editais(text, text[], int, numeric, int[], text, text, int)',
  'public.orgaos_abertos(text, int)',
  'public.relacionados(text, int)']) as f;

-- ── [P2] Uma assinatura só por função (as antigas saíram). Esperado: 3 linhas, com p_orgao nas três.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname in ('abertas_unicas', 'buscar_editais', 'mapa_editais')
order by 1;

-- ── [P3] Raio de 100 km a partir de Joinville (4209102).
-- Esperado: blumenau true, florianopolis false, joinville true.
select '4202404' in (select public.municipios_no_raio('4209102', 100)) as blumenau,
       '4205407' in (select public.municipios_no_raio('4209102', 100)) as florianopolis,
       '4209102' in (select public.municipios_no_raio('4209102', 100)) as joinville,
       (select count(*) from public.municipios_no_raio('4209102', 100)) as municipios_no_raio;
-- Lista com raio: editais de vários municípios vizinhos, nenhum de Florianópolis. Anotar os 5 primeiros.
select municipio_nome, count(*) as editais
from public.buscar_editais(p_ibge => '4209102', p_raio_km => 100, p_limite => 2000)
group by 1 order by 2 desc;
-- Tempo da lista e do mapa com raio (anotar "Execution Time").
explain (analyze, buffers) select * from public.buscar_editais(p_ibge => '4209102', p_raio_km => 100);
explain (analyze, buffers) select * from public.mapa_editais(p_ibge => '4209102', p_raio_km => 100);

-- ── [P4] Órgão. Esperado: a lista traz órgãos com "joinville" no nome, o de mais editais primeiro.
explain (analyze) select * from public.orgaos_abertos('joinville');
select * from public.orgaos_abertos('joinville');
-- Trocar <cnpj> pelo primeiro da lista acima. Esperado: orgaos = 1; total = qtd da lista; soma do mapa = total.
select count(distinct split_part(slug, '-', 1)) as orgaos, max(total) as total
from public.buscar_editais(p_orgao => '<cnpj>', p_limite => 2000);
select sum(qtd) as soma_mapa from public.mapa_editais(p_orgao => '<cnpj>');
-- Termo amplo (o pior caso da busca de órgãos). Anotar o tempo.
explain (analyze) select * from public.orgaos_abertos('prefeitura');

-- ── [P5] Relacionados. Três editais abertos: um de EPI, um de objeto longo, um qualquer.
select id, slug, left(objeto, 120) as objeto
from public.contratacoes
where encerramento_em > now() and busca @@ public.consulta('luva nitrilica, EPI, botina')
order by encerramento_em limit 5;
select id, slug, length(objeto) as tamanho from public.contratacoes
where encerramento_em > now() order by length(objeto) desc limit 3;
-- Trocar <id> por cada um. Esperado: até 6 linhas, nenhuma com o próprio id, objetos parecidos
-- (no de EPI: luvas, botinas, uniformes, EPI); os do mesmo UF tendem a vir primeiro.
select * from public.relacionados('<id>');
-- Tempo: meta abaixo de 300 ms em "Execution Time" nos três. Rodar cada um duas vezes e anotar a segunda.
explain (analyze, buffers) select * from public.relacionados('<id>');

-- ── [P6] eventos aceita usou_recurso (desfeito no fim: nada fica gravado). Esperado: INSERT 0 1, sem erro.
begin;
insert into public.eventos (visitante, tipo, detalhe, interno)
values (gen_random_uuid(), 'usou_recurso', '{"recurso": "filtro_raio"}', true);
rollback;

-- ── [P7] Depois da publicação: eventos usou_recurso por recurso (inclusive os internos do controlador).
select detalhe ->> 'recurso' as recurso, interno, count(*) from public.eventos
where tipo = 'usou_recurso' group by 1, 2 order by 1, 2;
