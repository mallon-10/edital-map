-- Edital Map · Evolução · Fase 3 · Conta, onboarding e Meu Radar: conferências do controlador (0014).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez; anotar em docs/fase-3-metricas.md.

-- ── [C0] ANTES da 0014. Esperado: perfis_plano_check existe; 0 linhas em auth.users, perfis, radares, salvos;
-- 3 políticas (perfil próprio, radares próprios, salvos próprios). Anotar os totais de hoje.
select conname from pg_constraint where conrelid = 'public.perfis'::regclass and contype = 'c';
select (select count(*) from auth.users) as usuarios, (select count(*) from public.perfis) as perfis,
       (select count(*) from public.radares) as radares, (select count(*) from public.salvos) as salvos;
select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('perfis', 'radares', 'salvos');
select (select max(total) from public.buscar_editais(p_limite => 1)) as lista,
       (select sum(qtd) from public.mapa_editais()) as mapa,
       (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1)) as lista_uniforme;

-- ── [C1] Permissões das funções. Esperado: anon e autenticado false, servico true, nas 6 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array[
  'public.exclusivo_me_epp(jsonb)',
  'public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int, text[], numeric, boolean)',
  'public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean)',
  'public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz)',
  'public.buscar_municipios(text, int)',
  'public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[])']) as f;

-- ── [C2] Uma assinatura por função. Esperado: 3 linhas; abertas_unicas e buscar_editais terminam em p_so_me_epp.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname in ('abertas_unicas', 'buscar_editais', 'mapa_editais')
order by 1;

-- ── [C3] Tabelas da conta. Esperado: 0 políticas; anon/autenticado false em tudo; service_role true; RLS ligado.
select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('perfis', 'radares', 'salvos', 'alertas_enviados');
select t,
       has_table_privilege('anon', t, 'select') as anon_le, has_table_privilege('authenticated', t, 'select') as aut_le,
       has_table_privilege('authenticated', t, 'insert') as aut_grava, has_table_privilege('service_role', t, 'update') as servico,
       (select relrowsecurity from pg_class where oid = t::regclass) as rls
from unnest(array['public.perfis', 'public.radares', 'public.salvos', 'public.alertas_enviados']) as t;
select column_name, data_type from information_schema.columns
where table_schema = 'public' and ((table_name = 'radares' and column_name in ('municipios', 'valor_max', 'so_me_epp', 'atualizado_em'))
   or (table_name = 'perfis' and column_name = 'ultima_visita_radar'));

-- ── [C4] Chamadas de hoje seguem iguais. Esperado: os mesmos três números de [C0] (ou muito perto, se o sync rodou).
select (select max(total) from public.buscar_editais(p_limite => 1)) as lista,
       (select sum(qtd) from public.mapa_editais()) as mapa,
       (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1)) as lista_uniforme;

-- ── [C5] Filtros novos. Esperado: so_municipios true; dentro_da_faixa true; todos_me_epp true (e linhas > 0 em cada).
select count(*) as linhas, bool_and(codigo_ibge in ('4209102', '4205407')) as so_municipios
from public.buscar_editais(p_ibges => array['4209102', '4205407'], p_limite => 500);
select count(*) as linhas, max(valor_estimado) as maior, bool_and(valor_estimado > 0 and valor_estimado <= 50000) as dentro_da_faixa
from public.buscar_editais(p_valor_min => 10000, p_valor_max => 50000, p_limite => 500);
select count(*) as linhas, bool_and(public.exclusivo_me_epp(c.itens_resumo)) as todos_me_epp
from public.buscar_editais(p_so_me_epp => true, p_limite => 500) b join public.contratacoes c on c.id = b.id;

-- ── [C6] Contagens do radar = lista. Esperado: total = lista_total; prazo_proximo = lista_7_dias; novas = lista_novas.
with r as (select * from public.radar_contagens(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'],
                                               p_desde => now() - interval '2 days'))
select r.total, (select max(total) from public.buscar_editais(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'], p_limite => 1)) as lista_total,
       r.prazo_proximo, (select max(total) from public.buscar_editais(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'], p_dias => 7, p_limite => 1)) as lista_7_dias,
       r.novas, (select count(*) from public.buscar_editais(p_termos => array['uniforme', 'luva'], p_ufs => array['SC', 'PR'], p_limite => 5000)
                 where publicada_em > now() - interval '2 days') as lista_novas
from r;

-- ── [C7] Tempo do radar com 5 produtos e os relacionados (expandir no site). Rodar cada um 2 vezes e anotar a 2ª
-- "Execution Time". Meta: < 500 ms em cada.
explain (analyze, buffers) select * from public.buscar_editais(
  p_termos => array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  p_relacionados => array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
    'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'roupa profissional',
    'luva nitrílica', 'desinfetante', 'brita', 'jaleco', 'luva de vaqueta', 'detergente', 'tijolo', 'impressora'],
  p_ordem => 'relevancia', p_limite => 20);
explain (analyze, buffers) select * from public.radar_contagens(
  p_termos => array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  p_relacionados => array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
    'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'roupa profissional',
    'luva nitrílica', 'desinfetante', 'brita', 'jaleco', 'luva de vaqueta', 'detergente', 'tijolo', 'impressora'],
  p_desde => now() - interval '1 day');

-- ── [C8] Municípios. Esperado: São José (SC) e outros "São José…" primeiro; Joinville/SC; nada com 'x%'.
select * from public.buscar_municipios('sao jose');
select * from public.buscar_municipios('joinv');
select count(*) from public.buscar_municipios('xq', 50);

-- ── [C9] Eventos. Esperado: a restrição lista os 11 tipos.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'eventos_tipo_check';

-- ── [C10] Depois do teste ponta a ponta (Task 10). Esperado: 1 perfil por usuário (gatilho); radar do dono com os
-- produtos escolhidos; eventos da conta sem e-mail no detalhe.
select u.email, p.plano, p.ultima_visita_radar, r.termos, r.ufs, r.municipios, r.valor_min, r.valor_max, r.so_me_epp, r.atualizado_em
from auth.users u left join public.perfis p on p.id = u.id left join public.radares r on r.user_id = u.id;
select tipo, detalhe, interno, criado_em from public.eventos
where tipo in ('conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto') order by criado_em desc limit 20;
