-- Edital Map · Evolução · Fase 4 · conferências da 0016 (controlador). Rodar uma seção por vez, conferindo o "Esperado".
-- Seções com begin/rollback não deixam nada gravado.

-- ── [D0] Antes de aplicar. Esperado: salvos_contratacao_id_fkey na lista; salvos 0 e alertas_enviados 0; tem_0015 true;
-- a restrição de eventos com os 12 tipos (inclui 'assinou'); anotar o total de "uniforme".
select conname from pg_constraint where conrelid = 'public.salvos'::regclass and contype = 'f';
select (select count(*) from public.salvos) as salvos, (select count(*) from public.alertas_enviados) as alertas_enviados;
select to_regclass('public.assinaturas') is not null as tem_0015;
select pg_get_constraintdef(oid) from pg_constraint where conname = 'eventos_tipo_check';
select max(total) as uniforme from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1);

-- ── [D1] Permissões. Esperado: nas 5 tabelas só service_role; RLS true; uma linha por função (uma assinatura),
-- anon e authenticated false, service_role true; prosecdef true só em plano_da_conta, alertas_para_envio e contas_para_resumo.
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('salvos', 'alertas', 'alertas_enviados', 'envios_alerta', 'envios_resumo')
  and grantee in ('anon', 'authenticated', 'service_role')
group by 1, 2 order by 1, 2;
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relname in ('salvos', 'alertas', 'alertas_enviados', 'envios_alerta', 'envios_resumo');
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as autenticado,
       has_function_privilege('service_role', p.oid, 'execute') as servico, p.prosecdef
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('plano_da_conta', 'gravar_salvo', 'salvos_da_conta', 'alertas_para_envio', 'editais_do_alerta',
                    'registrar_envio_alerta', 'buscar_editais', 'radar_contagens', 'aplicar_retencao',
                    'contas_para_resumo', 'resumo_do_radar', 'parar_resumo_semanal')
order by 1;

-- ── [D2] Chamadas antigas seguem valendo (site no ar ainda é o antigo). Esperado: o mesmo total de [D0];
-- radar_contagens sem p_sem_ids responde.
select max(total) as uniforme from public.buscar_editais(p_termos => array['uniforme'], p_limite => 1);
select * from public.radar_contagens(p_termos => array['uniforme'], p_ufs => array['SC'], p_desde => now() - interval '1 day');
with uma as (select id from public.buscar_editais(p_termos => array['uniforme'], p_ufs => array['SC'], p_limite => 1))
select (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_ufs => array['SC'], p_limite => 1))
     - (select max(total) from public.buscar_editais(p_termos => array['uniforme'], p_ufs => array['SC'], p_limite => 1,
                                                     p_sem_ids => array(select id from uma))) as menos_um;  -- Esperado: 1

-- ── [D3] Retenção não apaga salvo; descartado sai com a contratação (transação desfeita).
-- Esperado na última consulta: a linha 'salvo' com contratacao preenchida; a 'descartado' com tudo nulo.
begin;
create temporary table t_alvo on commit drop as
  select id, row_number() over (order by id) as n from public.contratacoes where encerramento_em > now() order by id limit 2;
update public.contratacoes set encerramento_em = now() - interval '8 days' where id in (select id from t_alvo);
insert into public.salvos (user_id, contratacao_id, status)
select (select id from auth.users where email = '<e-mail do dono>'), id, case when n = 1 then 'salvo' else 'descartado' end from t_alvo;
select public.aplicar_retencao() >= 1 as apagou;
select t.n, c.id as contratacao, s.status from t_alvo t
left join public.contratacoes c on c.id = t.id left join public.salvos s on s.contratacao_id = t.id order by t.n;
rollback;

-- ── [D4] gravar_salvo e salvos_da_conta (transação desfeita). Esperado, na ordem: ok, limite, ok, ok, limite, sem_edital;
-- depois n1 'analise' e n2 'descartado'; salvos_da_conta com 2 linhas e slug/objeto preenchidos.
begin;
create temporary table t_e on commit drop as
  select id, row_number() over (order by id) as n from public.contratacoes where encerramento_em > now() order by id limit 2;
create temporary table t_d on commit drop as select id from auth.users where email = '<e-mail do dono>';
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 1), 'salvo', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 2), 'salvo', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 2), 'descartado', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 1), 'analise', 1);
select public.gravar_salvo((select id from t_d), (select id from t_e where n = 2), 'participar', 1);
select public.gravar_salvo((select id from t_d), '00000000000000-1-000000/2000', 'salvo', 10);
select e.n, s.status from public.salvos s join t_e e on e.id = s.contratacao_id where s.user_id = (select id from t_d) order by e.n;
select contratacao_id, status, slug is not null as tem_slug, objeto is not null as tem_objeto from public.salvos_da_conta((select id from t_d));
rollback;

-- ── [D5] Plano da conta. Esperado: dono = pro (depois do Step 6 da Task 2); ninguem = gratis (só gratis e pro existem);
-- assinaturas com o e-mail de alguma conta (pode ser 0 linhas).
select public.plano_da_conta((select id from auth.users where email = '<e-mail do dono>')) as dono,
       public.plano_da_conta('00000000-0000-0000-0000-000000000000') as ninguem;
select a.plano, a.status, a.valido_ate > now() as valida from public.assinaturas a join auth.users u on a.email = lower(u.email);

-- ── [D6] Alerta de ponta a ponta no banco (transação desfeita). Esperado: N1 > 0 na maioria dos dias (anotar);
-- depois de marcar 3 como enviados, N2 = min(N1_total - 3, 20) e nenhum dos 3 volta; alertas_para_envio com 1 linha
-- (e-mail do dono, plano pro); envios_alerta 'enviado' 2 1; alertas_enviados 5; ultimo_envio_em preenchido.
begin;
insert into public.alertas (id, user_id, nome, termos)
values ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = '<e-mail do dono>'), 'teste', array['uniforme']);
select count(*) as n1, max(total) as n1_total from public.editais_do_alerta('11111111-1111-4111-8111-111111111111', now() - interval '3 days', array['uniforme'], array['fardamento', 'jaleco']);
create temporary table t_env on commit drop as
  select id from public.editais_do_alerta('11111111-1111-4111-8111-111111111111', now() - interval '3 days', array['uniforme'], array['fardamento', 'jaleco']) limit 3;
insert into public.alertas_enviados (alerta_id, contratacao_id) select '11111111-1111-4111-8111-111111111111', id from t_env;
select count(*) as n2, count(*) filter (where id in (select id from t_env)) as repetidos
from public.editais_do_alerta('11111111-1111-4111-8111-111111111111', now() - interval '3 days', array['uniforme'], array['fardamento', 'jaleco']);
select alerta_id, email, plano, nome from public.alertas_para_envio();
select public.registrar_envio_alerta('11111111-1111-4111-8111-111111111111', 'enviado', 2, 1, null, 'msg-teste',
                                     array['x1', 'x2'], now(), true) is not null as gravou;
select status, qtd_editais, tentativas from public.envios_alerta where alerta_id = '11111111-1111-4111-8111-111111111111';
select count(*) as enviados from public.alertas_enviados where alerta_id = '11111111-1111-4111-8111-111111111111';
select ultimo_envio_em is not null as avancou from public.alertas where id = '11111111-1111-4111-8111-111111111111';
rollback;

-- ── [D7] Tempo do alerta com 5 produtos e 12 relacionados (o teto do radar). Rodar 2 vezes e anotar a 2ª
-- "Execution Time". Meta: < 1 s. (Cria e desfaz um alerta só para existir o id.)
begin;
insert into public.alertas (id, user_id, nome, termos)
values ('22222222-2222-4222-8222-222222222222', (select id from auth.users where email = '<e-mail do dono>'), 'tempo', array['uniforme']);
explain (analyze, buffers) select * from public.editais_do_alerta('22222222-2222-4222-8222-222222222222', now() - interval '1 day',
  array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
        'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'jaleco']);
rollback;

-- ── [D8] Eventos. Esperado: a restrição lista os 17 tipos.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'eventos_tipo_check';

-- ── [D10] Resumo semanal (transação desfeita; depois do Step 6 da Task 2 o dono é Pro e tem radar). Esperado:
-- contas_para_resumo com a conta do dono; o resumo com total = cartão "Oportunidades para o seu perfil" do Meu Radar
-- dele (anotar), até 10 novos, até 5 encerrando, até 5 órgãos e cidades; depois de um 'enviado' a conta sai da lista
-- (0); parar_resumo_semanal = true. Tempo do explain (2ª execução) < 1,5 s.
begin;
select user_id, email, termos, ufs, municipios from public.contas_para_resumo();
select jsonb_pretty(public.resumo_do_radar(r.user_id, r.termos, p_excluir => nullif(r.termos_excluir, '{}'),
       p_ufs => nullif(r.ufs, '{}'), p_ibges => nullif(r.municipios, '{}')))
from public.radares r join auth.users u on u.id = r.user_id where u.email = '<e-mail do dono>';
explain (analyze, buffers) select public.resumo_do_radar((select id from auth.users where email = '<e-mail do dono>'),
  array['uniforme', 'luva', 'material de limpeza', 'cimento', 'notebook'],
  array['EPI', 'material de construção', 'informática', 'fardamento', 'equipamento de proteção individual',
        'produto de limpeza', 'computador', 'vestuário profissional', 'saneante', 'areia', 'microcomputador', 'jaleco']);
insert into public.envios_resumo (user_id, status, qtd_editais, tentativas)
values ((select id from auth.users where email = '<e-mail do dono>'), 'enviado', 3, 1);
select count(*) as ainda_na_lista from public.contas_para_resumo() where email = '<e-mail do dono>';
select public.parar_resumo_semanal((select id from auth.users where email = '<e-mail do dono>')) as desligou;
rollback;

-- ── [D9] Depois do teste ponta a ponta (Task 14). Esperado: salvos do dono com os status escolhidos; alertas do dono
-- (um pausado pelo link); envios_alerta com 'enviado' na 1ª rodada e 'sem_novidades' na 2ª; alertas_enviados sem
-- repetição (duplicados = 0); envios_resumo com 1 'enviado'; resumo_semanal false depois do link (e true depois de
-- religar em /alertas); eventos da fase sem e-mail no detalhe.
select s.status, count(*) from public.salvos s join auth.users u on u.id = s.user_id
where u.email = '<e-mail do dono>' group by 1 order by 1;
select a.nome, a.ativo, a.ultimo_envio_em from public.alertas a join auth.users u on u.id = a.user_id
where u.email = '<e-mail do dono>' order by a.criado_em;
select a.nome, e.iniciado_em, e.status, e.qtd_editais, e.tentativas, e.erro, e.id_mensagem is not null as tem_id
from public.envios_alerta e join public.alertas a on a.id = e.alerta_id order by e.iniciado_em desc limit 20;
select count(*) - count(distinct (alerta_id, contratacao_id)) as duplicados, count(*) as total from public.alertas_enviados;
select status, qtd_editais, tentativas, erro, iniciado_em from public.envios_resumo order by iniciado_em desc limit 10;
select p.resumo_semanal from public.perfis p join auth.users u on u.id = p.id where u.email = '<e-mail do dono>';
select tipo, detalhe, interno, criado_em from public.eventos
where tipo in ('edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado') order by criado_em desc limit 20;
