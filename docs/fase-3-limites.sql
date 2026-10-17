-- Edital Map · Fase 3 · Limites do grátis e lista de espera: conferências do controlador (0009).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez.
-- [L2]–[L6] rodam dentro de begin … rollback: nada fica gravado. [L3] chama aplicar_retencao(): fora das rodadas do sync.
-- Concorrência (várias conexões ao mesmo tempo): npx tsx scripts/conferir-limites.ts.

-- ── [L0] Antes da 0009. Esperado: a restrição da 0007 (6 tipos, sem limite_atingido) e o job de retenção ativo, '45 4 * * *'.
select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.eventos'::regclass and conname = 'eventos_tipo_check';
select jobname, schedule, command, active from cron.job where jobname = 'retencao-contratacoes';

-- ── [L1] Depois da 0009: permissões. Esperado: anon e autenticado false, servico true, nas 3 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array['public.registrar_uso(uuid, text, text, int)', 'public.uso_do_dia(uuid)', 'public.aplicar_retencao()']) as f;
-- Esperado: anon_le, anon_grava e autenticado_le false; servico_grava e rls true, nas 2 linhas.
select t,
       has_table_privilege('anon', t, 'select') as anon_le,
       has_table_privilege('anon', t, 'insert') as anon_grava,
       has_table_privilege('authenticated', t, 'select') as autenticado_le,
       has_table_privilege('service_role', t, 'insert') as servico_grava,
       (select relrowsecurity from pg_class where oid = t::regclass) as rls
from unnest(array['public.uso_diario', 'public.lista_espera']) as t;
-- Esperado: os 6 tipos de antes + limite_atingido.
select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.eventos'::regclass and conname = 'eventos_tipo_check';

-- ── [L2] registrar_uso: repetir não conta, 4ª chave recusada, editais à parte, outro dia zera.
-- Esperado: sem erro (uma asserção que falha para tudo com "assertion failed: <passo>").
begin;
do $$
declare
  v uuid := '00000000-0000-4000-8000-000000000009';
  ontem uuid := '00000000-0000-4000-8000-00000000000a';
  r record;
begin
  select * into r from public.registrar_uso(v, 'busca', 'chave-a', 3); assert r.permitido and r.usados = 1, 'a1: primeira busca';
  select * into r from public.registrar_uso(v, 'busca', 'chave-a', 3); assert r.permitido and r.usados = 1, 'a2: repetir não conta';
  select * into r from public.registrar_uso(v, 'busca', 'chave-b', 3); assert r.permitido and r.usados = 2, 'b: segunda';
  select * into r from public.registrar_uso(v, 'busca', 'chave-c', 3); assert r.permitido and r.usados = 3, 'c: terceira';
  select * into r from public.registrar_uso(v, 'busca', 'chave-d', 3); assert not r.permitido and r.usados = 3, 'd: 4ª chave recusada';
  select * into r from public.registrar_uso(v, 'busca', 'chave-a', 3); assert r.permitido and r.usados = 3, 'a3: repetir uma do dia continua valendo';
  select * into r from public.registrar_uso(v, 'edital', '00394452000103-2026-21982', 3); assert r.permitido and r.usados = 1, 'e: editais contam à parte';
  select * into r from public.uso_do_dia(v); assert r.buscas = 3 and r.editais = 1, 'uso_do_dia';
  assert (select count(*) from public.uso_diario where visitante = v) = 4, 'a chave recusada não grava';
  insert into public.uso_diario (visitante, dia, tipo, chave)
  select ontem, (now() at time zone 'America/Sao_Paulo')::date - 1, 'busca', 'ontem-' || g from generate_series(1, 3) g;
  select * into r from public.registrar_uso(ontem, 'busca', 'hoje-1', 3); assert r.permitido and r.usados = 1, 'outro dia zera';
  raise notice 'registrar_uso: tudo certo';
end $$;
rollback;

-- ── [L3] Limpeza diária: aplicar_retencao apaga o uso de ontem e mantém o de hoje. Esperado: 1 linha, chave 'hoje'.
begin;
insert into public.uso_diario (visitante, dia, tipo, chave) values
  ('00000000-0000-4000-8000-00000000000b', (now() at time zone 'America/Sao_Paulo')::date - 1, 'busca', 'ontem'),
  ('00000000-0000-4000-8000-00000000000b', (now() at time zone 'America/Sao_Paulo')::date, 'busca', 'hoje');
select public.aplicar_retencao();
select dia, chave from public.uso_diario where visitante = '00000000-0000-4000-8000-00000000000b';
rollback;

-- ── [L4] lista_espera aceita basic e pro. Esperado: INSERT 0 1 duas vezes.
begin;
insert into public.lista_espera (email, plano, interno) values ('conferencia@exemplo.com', 'basic', true);
insert into public.lista_espera (email, plano, interno) values ('conferencia@exemplo.com', 'pro', true);
rollback;
-- Esperado: erro "violates check constraint lista_espera_plano_check".
begin;
insert into public.lista_espera (email, plano, interno) values ('conferencia@exemplo.com', 'premium', true);
rollback;

-- ── [L5] eventos aceita limite_atingido. Esperado: INSERT 0 1, sem erro.
begin;
insert into public.eventos (visitante, tipo, detalhe, interno) values (gen_random_uuid(), 'limite_atingido', '{"tipo": "busca"}', true);
rollback;

-- ── [L6] Tempo de registrar_uso (anotar "Execution Time"; meta < 20 ms).
begin;
explain (analyze) select * from public.registrar_uso('00000000-0000-4000-8000-00000000000c', 'busca', 'tempo', 3);
rollback;

-- ── [L7] Depois da publicação: uso de hoje, limite atingido, interesse nos planos e lista de espera.
select tipo, count(distinct visitante) as visitantes, count(*) as linhas
from public.uso_diario where dia = (now() at time zone 'America/Sao_Paulo')::date group by 1;
select detalhe ->> 'tipo' as tipo, interno, count(*) from public.eventos where tipo = 'limite_atingido' group by 1, 2;
select detalhe ->> 'recurso' as recurso, interno, count(*) from public.eventos
where tipo = 'quer_recurso' and detalhe ->> 'recurso' in ('plano_basic', 'plano_pro') and criado_em > now() - interval '1 day'
group by 1, 2;
select plano, interno, count(*) from public.lista_espera group by 1, 2;

-- ── [L8] Período da lista de espera (desde a 0010). Esperado: o 1º INSERT dá INSERT 0 1; o 2º ('semestral') falha com "lista_espera_periodo_check".
begin;
insert into public.lista_espera (email, plano, periodo, interno) values ('conferencia@exemplo.com', 'basic', 'anual', true);
rollback;
begin;
insert into public.lista_espera (email, plano, periodo, interno) values ('conferencia@exemplo.com', 'basic', 'semestral', true);
rollback;
