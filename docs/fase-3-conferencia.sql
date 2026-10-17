-- Edital Map · Fase 3 · Brasil todo: conferências do controlador.
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez.

-- ── [M1-d] Abertas, contadas contra uma hora fixa (funciona antes e depois da 0005 e da 0006).
-- Antes: rodar como está e anotar medido_em e abertas. Depois: trocar now() em ref pelo medido_em anotado
-- (ex.: timestamptz '2026-10-16 14:05:00+00'). Esperado: abertas igual ao anotado (sem rodada do sync no meio).
-- Contar contra a mesma hora tira da comparação as que encerraram entre as duas medidas.
with ref(t) as (select now())
select (select t from ref) as medido_em, count(*) as abertas
from public.contratacoes c
where c.encerramento_em > (select t from ref);

-- ── [M1-d'] Só depois da 0005: abertas ainda sem resumo. Logo depois da 0005: as abertas sem nenhuma linha
-- em itens. Depois do worker:reler-itens: perto de 0 (só compras cuja lista de itens o PNCP devolve vazia).
select count(*) as abertas, count(*) filter (where itens_resumo is null) as abertas_sem_resumo
from public.contratacoes where encerramento_em > now();

-- ── [M1-a] Logo depois da 0005 (antes do merge e da 0006) ─────────────────────────────────────────
-- A busca pelas palavras (itens_palavras) não perde nenhuma aberta que a tabela itens achava.
-- Esperado: perdidas = 0 em todas as linhas e pela_tabela > 0 em "nitrílica" (se der 0, troque por outro
-- termo que só aparece em itens). ganhas é só informativo: consulta() exige todas as palavras de um termo,
-- e a tabela exigia no mesmo item; as palavras aceitam em itens diferentes do mesmo edital
-- (ex.: "cadeira de rodas"), então a busca nova acha a mais por desenho.
-- Só compras com resumo: as gravadas pelo worker antigo depois da 0005 ficam sem palavras até a releitura.
with termos(t, tq) as (
  select v.t, public.consulta(v.t)
  from (values ('nitrílica'), ('botina'), ('luva'), ('capacete'), ('EPI e uniformes'), ('cadeira de rodas')) v(t)
),
cmp as (
  select tm.t,
         exists (select 1 from public.itens i where i.contratacao_id = c.id and i.busca @@ tm.tq) as antigo,
         coalesce(c.itens_palavras @@ tm.tq, false) as novo
  from termos tm cross join public.contratacoes c
  where c.encerramento_em > now()
    and c.itens_resumo is not null
)
select t, count(*) filter (where antigo) as pela_tabela, count(*) filter (where novo) as pelas_palavras,
       count(*) filter (where antigo and not novo) as perdidas,
       count(*) filter (where novo and not antigo) as ganhas
from cmp group by t order by t;

-- ── [M1-b] Todo edital com itens dentro da janela de retenção ganhou resumo com o total certo. Esperado: 0 e 0
-- (antes de qualquer rodada do worker antigo depois da 0005). A 0005 só preenche encerramento nos últimos
-- 7 dias ou depois; aqui 6 dias, para a hora do relógio entre a migração e a consulta não acusar a borda.
select count(*) filter (where c.itens_resumo is null) as sem_resumo,
       count(*) filter (where (c.itens_resumo ->> 'total')::int <> r.total) as total_diferente
from (select contratacao_id, count(*)::int as total from public.itens group by 1) r
join public.contratacoes c on c.id = r.contratacao_id
where c.encerramento_em > now() - interval '6 days';

-- (Histórico: a assinatura de 8 argumentos de buscar_editais usada abaixo sai na 0007; depois dela, conferir em docs/fase-3-recursos-pro.sql [P1].)
-- ── [M1-c] Permissões. Esperado: false, true, false, false, true, true.
select has_function_privilege('anon', 'public.gravar_resumo_itens(text, text, jsonb)', 'execute') as anon_grava,
       has_function_privilege('service_role', 'public.gravar_resumo_itens(text, text, jsonb)', 'execute') as servico_grava,
       has_function_privilege('anon', 'public.buscar_editais(text, text[], text, int, numeric, int[], int, int)', 'execute') as anon_busca,
       has_function_privilege('anon', 'public.abertas(text, text[], numeric)', 'execute') as anon_abertas,
       has_function_privilege('service_role', 'public.buscar_editais(text, text[], text, int, numeric, int[], int, int)', 'execute') as servico_busca,
       has_function_privilege('service_role', 'public.abertas(text, text[], numeric)', 'execute') as servico_abertas;

-- ── [M2] Depois da 0006. Esperado: tabela_itens nula; fora_da_retencao = 0.
select to_regclass('public.itens') as tabela_itens,
       (select count(*) from public.contratacoes
         where encerramento_em is null or encerramento_em < now() - interval '7 days') as fora_da_retencao;
-- Esperado: sync-pncp '17 */3 * * *' e retencao-contratacoes '45 4 * * *' (UTC), ativos.
select jobname, schedule, active from cron.job order by jobname;
-- No dia seguinte. Esperado: status 'succeeded'.
select status, return_message, start_time from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'retencao-contratacoes')
 order by start_time desc limit 3;

-- ── [M3] Depois da carga do Brasil todo. Esperado: 27 linhas, todas com abertas > 0.
select uf, count(*) as abertas from public.contratacoes where encerramento_em > now() group by uf order by uf;
-- Chaves nacionais do sync. Esperado: 5 chaves (6, 8, 4, 7, 12) com status ok e ultima_data de hoje.
select chave, ultima_data, ultima_execucao, status, erro from public.sync_estado
 where chave like 'atualizacao:BR:%' order by chave;
-- Desempenho do mapa sem busca (o país inteiro). Anotar o tempo de execução.
explain (analyze, buffers) select * from public.mapa_editais(null);
