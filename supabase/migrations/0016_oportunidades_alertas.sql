-- Edital Map · Evolução · Fase 4 · Minhas Oportunidades e alertas reais (0016).
-- 1. salvos: status pessoal (salvo | analise | participar | descartado), observação (até 500), atualizado_em; sai a
--    chave estrangeira para contratacoes (a retenção não apaga contratação salva; a lista mostra "indisponível" se faltar).
-- 2. alertas (vários por conta, mesmos filtros do radar), alertas_enviados por alerta (chave dupla: nunca o mesmo
--    edital duas vezes no mesmo alerta) e envios_alerta (histórico de cada tentativa).
-- 3. Funções só do servidor: plano_da_conta (gratis | pro: perfis.plano manual ou assinatura válida com o e-mail da
--    conta; o Basic, descontinuado, vale como Pro), gravar_salvo (limite por plano numa transação), salvos_da_conta,
--    alertas_para_envio, editais_do_alerta, registrar_envio_alerta. buscar_editais e radar_contagens ganham p_sem_ids
--    (descartados somem do Meu Radar); corpos iguais aos da 0014 fora isso (guarda em scripts/migracoes.test.ts).
-- 4. Resumo semanal do Pro (segunda às 7h): perfis.resumo_semanal, envios_resumo, contas_para_resumo, resumo_do_radar
--    e parar_resumo_semanal (link do e-mail).
-- 5. Retenção: não apaga contratação salva (descartada sai junto com ela); limpa alertas_enviados órfãos e históricos
--    com mais de 180 dias. Mantém o que a 0015 (pagamento) acrescentou.
-- 6. Eventos: os 12 de antes (0014 + assinou da 0015) + edital_salvo, edital_descartado, alerta_criado, alerta_enviado,
--    resumo_enviado.
-- Pré-requisito: 0015 aplicada (assinaturas, checkouts, cakto_eventos). Ordem: esta migração → conferências
-- (docs/evolucao-fase-4.sql) → vercel deploy --prod → workflow alertas.yml no main. Aplicar com npm run db:aplicar.

set local lock_timeout = '10s';

-- 1. Salvos (a tabela da 0001 está vazia; sem a chave estrangeira, a retenção decide o que fica)
alter table public.salvos drop constraint salvos_contratacao_id_fkey;
alter table public.salvos
  add column status text not null default 'salvo',
  add column observacao text,
  add column atualizado_em timestamptz not null default now();
alter table public.salvos
  add constraint salvos_status_check check (status in ('salvo', 'analise', 'participar', 'descartado')),
  add constraint salvos_observacao_check check (observacao is null or char_length(observacao) <= 500);
create index salvos_user_status_idx on public.salvos (user_id, status);
create index salvos_contratacao_idx on public.salvos (contratacao_id);

-- 2. Alertas. alertas_enviados (0001) era por radar e nunca foi usada: sai e volta por alerta.
do $$
begin
  if exists (select 1 from public.alertas_enviados) then
    raise exception 'alertas_enviados tem linhas; esperado vazio antes da 0016';
  end if;
end $$;
drop table public.alertas_enviados;

create table public.alertas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nome            text not null,
  termos          text[] not null,
  termos_excluir  text[] not null default '{}',
  ufs             text[] not null default '{}',
  municipios      text[] not null default '{}',
  valor_min       numeric(16,2),
  valor_max       numeric(16,2),
  modalidades     int[] not null default '{}',
  so_me_epp       boolean not null default false,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  ultimo_envio_em timestamptz,
  constraint alertas_nome_check check (char_length(nome) between 1 and 60),
  constraint alertas_termos_check check (cardinality(termos) between 1 and 10),
  constraint alertas_excluir_check check (cardinality(termos_excluir) <= 10),
  constraint alertas_ufs_check check (cardinality(ufs) <= 27),
  constraint alertas_municipios_check check (cardinality(municipios) <= 50),
  constraint alertas_local_check check (cardinality(ufs) = 0 or cardinality(municipios) = 0),
  constraint alertas_valor_check check ((valor_min is null or valor_min >= 0) and (valor_max is null or valor_max > 0)),
  constraint alertas_faixa_check check (valor_min is null or valor_max is null or valor_min <= valor_max)
);
create index alertas_user_id_idx on public.alertas (user_id);

-- A chave primária (alerta_id, contratacao_id) é o índice por alerta e a garantia de não repetir.
create table public.alertas_enviados (
  alerta_id       uuid not null references public.alertas(id) on delete cascade,
  contratacao_id  text not null,
  enviado_em      timestamptz not null default now(),
  primary key (alerta_id, contratacao_id)
);

create table public.envios_alerta (
  id           uuid primary key default gen_random_uuid(),
  alerta_id    uuid not null references public.alertas(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  iniciado_em  timestamptz not null default now(),
  status       text not null check (status in ('enviado', 'sem_novidades', 'falhou', 'pulado_plano')),
  qtd_editais  int not null default 0,
  tentativas   int not null default 0,
  erro         text check (erro is null or char_length(erro) <= 300),
  id_mensagem  text
);
create index envios_alerta_alerta_idx on public.envios_alerta (alerta_id, iniciado_em desc);

-- Só o servidor lê e grava (service_role); nenhuma política para anon/authenticated.
alter table public.alertas enable row level security;
alter table public.alertas_enviados enable row level security;
alter table public.envios_alerta enable row level security;
revoke all on table public.alertas from public, anon, authenticated;
revoke all on table public.alertas_enviados from public, anon, authenticated;
revoke all on table public.envios_alerta from public, anon, authenticated;
grant select, insert, update, delete on table public.alertas to service_role;
grant select, insert, update, delete on table public.alertas_enviados to service_role;
grant select, insert, update, delete on table public.envios_alerta to service_role;

-- 3. Plano da conta (gratis | pro): perfis.plano (marcação manual) ou uma assinatura válida (0015: não estornada e
-- valido_ate no futuro; cancelada vale até valido_ate) cujo e-mail do comprador é o e-mail da conta. 'basic' (plano
-- descontinuado; linhas antigas) vale como Pro até o fim da validade. O plano do navegador (plano_do_visitante) o site
-- soma por fora. security definer: lê auth.users.
create function public.plano_da_conta(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  with planos as (
    select p.plano from public.perfis p where p.id = p_user
    union all
    select a.plano
    from auth.users u
    join public.assinaturas a on a.email = lower(u.email)
    where u.id = p_user and a.status <> 'estornada' and a.valido_ate > now()
  )
  select case when bool_or(plano in ('pro', 'basic')) then 'pro' else 'gratis' end
  from planos
$$;

-- Salvar, mudar status ou descartar (uma transação por conta): edital novo nos salvos precisa existir; entrar em
-- salvo/análise/participar vindo de fora ou de "descartado" respeita p_limite; descartados até 500.
-- Devolve 'ok', 'limite' ou 'sem_edital'.
create function public.gravar_salvo(p_user uuid, p_contratacao text, p_status text, p_limite int)
returns text language plpgsql as $$
declare
  v_atual text;
  v_usados int;
begin
  perform pg_advisory_xact_lock(hashtextextended('salvos:' || p_user::text, 0));
  select s.status into v_atual from public.salvos s where s.user_id = p_user and s.contratacao_id = p_contratacao;
  if v_atual is null and not exists (select 1 from public.contratacoes c where c.id = p_contratacao) then
    return 'sem_edital';
  end if;
  if p_status <> 'descartado' and (v_atual is null or v_atual = 'descartado') then
    select count(*) into v_usados from public.salvos s where s.user_id = p_user and s.status <> 'descartado';
    if v_usados >= coalesce(p_limite, 0) then
      return 'limite';
    end if;
  elsif p_status = 'descartado' and v_atual is distinct from 'descartado' then
    select count(*) into v_usados from public.salvos s where s.user_id = p_user and s.status = 'descartado';
    if v_usados >= 500 then
      return 'limite';
    end if;
  end if;
  insert into public.salvos (user_id, contratacao_id, status) values (p_user, p_contratacao, p_status)
  on conflict (user_id, contratacao_id) do update set status = excluded.status, atualizado_em = now();
  return 'ok';
end $$;

-- Minhas Oportunidades: salvos da conta com os dados do edital (nulos se a contratação não existir mais).
create function public.salvos_da_conta(p_user uuid)
returns table (contratacao_id text, status text, observacao text, criado_em timestamptz, atualizado_em timestamptz,
               slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, situacao_id int)
language sql stable as $$
  select s.contratacao_id, s.status, s.observacao, s.criado_em, s.atualizado_em,
         c.slug, c.objeto, c.orgao_nome, c.municipio_nome, c.uf, c.valor_estimado, c.encerramento_em, c.situacao_id
  from public.salvos s
  left join public.contratacoes c on c.id = s.contratacao_id
  where s.user_id = p_user
  order by s.criado_em desc
  limit 1000
$$;

-- Envio diário: alertas ativos com o e-mail atual da conta e o plano da conta na hora (perfis.plano + assinatura).
create function public.alertas_para_envio()
returns table (alerta_id uuid, user_id uuid, email text, plano text, nome text, termos text[], termos_excluir text[],
               ufs text[], municipios text[], valor_min numeric, valor_max numeric, modalidades int[], so_me_epp boolean,
               ultimo_envio_em timestamptz, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.user_id, lower(u.email), public.plano_da_conta(a.user_id), a.nome, a.termos, a.termos_excluir,
         a.ufs, a.municipios, a.valor_min, a.valor_max, a.modalidades, a.so_me_epp, a.ultimo_envio_em, a.criado_em
  from public.alertas a
  join auth.users u on u.id = a.user_id
  where a.ativo and u.email is not null
  order by a.user_id, a.criado_em, a.id
$$;

-- Editais de um alerta: a mesma busca do radar (abertas_unicas + acertos_busca, ordem por relevância), só os que
-- entraram no espelho (sincronizada_em) ou mudaram no PNCP (atualizada_pncp_em) depois de p_desde, sem os já enviados
-- para este alerta e sem os que a conta descartou. total = quantos casam (antes do limite).
create function public.editais_do_alerta(
  p_alerta uuid, p_desde timestamptz,
  p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null,
  p_limite int default 20)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, situacao_id int, pontuacao int, total bigint)
language plpgsql stable set plan_cache_mode = force_custom_plan as $$
#variable_conflict use_column
declare
  v_digitados text[] := public.termos_da_busca(null, p_termos);
  v_relacionados text[] := coalesce(p_relacionados, '{}'::text[]);
  v_termos text[] := v_digitados || v_relacionados;
  v_tq tsquery := public.consulta_termos(v_digitados || v_relacionados);
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
  v_tqs tsquery[];
  v_frases tsquery[];
  v_user uuid;
begin
  select a.user_id into v_user from public.alertas a where a.id = p_alerta;
  if v_user is null or v_tq is null then
    return;
  end if;
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  return query
    select u.id, u.slug, u.objeto, u.orgao_nome, u.municipio_nome, u.uf, u.valor_estimado, u.encerramento_em,
           u.situacao_id, a.pontuacao, count(*) over ()
    from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u
    cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
    where greatest(u.sincronizada_em, u.atualizada_pncp_em) > p_desde
      and not exists (select 1 from public.alertas_enviados e where e.alerta_id = p_alerta and e.contratacao_id = u.id)
      and not exists (select 1 from public.salvos s where s.user_id = v_user and s.contratacao_id = u.id and s.status = 'descartado')
    order by a.pontuacao desc, u.encerramento_em, u.id
    limit least(greatest(coalesce(p_limite, 20), 1), 50);
end $$;

-- Resultado de um alerta numa rodada (uma transação): histórico; se enviado, os editais entram em alertas_enviados
-- (só depois do aceite do Resend) e a janela avança para p_selecionado_em, a não ser que tenham ficado editais de fora
-- (p_avancar falso: ficam para o próximo e-mail). Alerta excluído no meio da rodada: nada a gravar (null).
create function public.registrar_envio_alerta(
  p_alerta uuid, p_status text, p_qtd int, p_tentativas int, p_erro text default null,
  p_id_mensagem text default null, p_ids text[] default null,
  p_selecionado_em timestamptz default now(), p_avancar boolean default true)
returns uuid language plpgsql as $$
declare
  v_user uuid;
  v_id uuid;
begin
  select a.user_id into v_user from public.alertas a where a.id = p_alerta;
  if v_user is null then
    return null;
  end if;
  insert into public.envios_alerta (alerta_id, user_id, iniciado_em, status, qtd_editais, tentativas, erro, id_mensagem)
  values (p_alerta, v_user, p_selecionado_em, p_status, coalesce(p_qtd, 0), coalesce(p_tentativas, 0), left(p_erro, 300), p_id_mensagem)
  returning id into v_id;
  if p_status = 'enviado' then
    insert into public.alertas_enviados (alerta_id, contratacao_id)
    select p_alerta, x.id from unnest(coalesce(p_ids, '{}'::text[])) as x(id)
    on conflict do nothing;
    update public.alertas
       set ultimo_envio_em = case when p_avancar then p_selecionado_em
                                  else coalesce(ultimo_envio_em, p_selecionado_em - interval '24 hours') end
     where id = p_alerta;
  end if;
  return v_id;
end $$;

-- 4. Resumo semanal do Pro: preferência na conta (ligado por padrão; o link do e-mail desliga), histórico por conta.
alter table public.perfis add column resumo_semanal boolean not null default true;

create table public.envios_resumo (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  iniciado_em  timestamptz not null default now(),
  status       text not null check (status in ('enviado', 'sem_novidades', 'falhou')),
  qtd_editais  int not null default 0,
  tentativas   int not null default 0,
  erro         text check (erro is null or char_length(erro) <= 300),
  id_mensagem  text
);
create index envios_resumo_user_idx on public.envios_resumo (user_id, iniciado_em desc);
alter table public.envios_resumo enable row level security;
revoke all on table public.envios_resumo from public, anon, authenticated;
grant select, insert, update, delete on table public.envios_resumo to service_role;

-- Contas que recebem o resumo: plano da conta Pro, com radar, resumo ligado e sem resumo enviado nos últimos 6 dias
-- (rodar de novo na mesma semana não repete).
create function public.contas_para_resumo()
returns table (user_id uuid, email text, termos text[], termos_excluir text[], ufs text[], municipios text[],
               valor_min numeric, valor_max numeric, modalidades int[], so_me_epp boolean)
language sql stable security definer set search_path = '' as $$
  select r.user_id, lower(u.email), r.termos, r.termos_excluir, r.ufs, r.municipios, r.valor_min, r.valor_max,
         r.modalidades, r.so_me_epp
  from public.radares r
  join public.perfis p on p.id = r.user_id
  join auth.users u on u.id = r.user_id
  where p.resumo_semanal and u.email is not null and public.plano_da_conta(r.user_id) = 'pro'
    and not exists (select 1 from public.envios_resumo e
                    where e.user_id = r.user_id and e.status = 'enviado' and e.iniciado_em > now() - interval '6 days')
  order by r.user_id
$$;

-- O resumo de uma conta numa passada, sobre as mesmas abertas do Meu Radar (sem os descartados da conta): novas da
-- semana (publicação nos últimos 7 dias, a regra de "Novas" do radar), as que encerram até o fim do dia de hoje + 7,
-- total aberto, valor somado (só os com valor informado), os 10 novos mais relevantes, os 5 que encerram primeiro e os
-- 5 órgãos e 5 cidades com mais editais abertos no radar. Sem termo válido: null.
create function public.resumo_do_radar(
  p_user uuid, p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null)
returns jsonb language plpgsql stable set plan_cache_mode = force_custom_plan as $$
declare
  v_digitados text[] := public.termos_da_busca(null, p_termos);
  v_relacionados text[] := coalesce(p_relacionados, '{}'::text[]);
  v_termos text[] := v_digitados || v_relacionados;
  v_tq tsquery := public.consulta_termos(v_digitados || v_relacionados);
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
  v_tqs tsquery[];
  v_frases tsquery[];
  v_semana timestamptz := now() - interval '7 days';
  v_prazo timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => 7 + 1)) at time zone 'America/Sao_Paulo';
  v_resumo jsonb;
begin
  if v_tq is null then
    return null;
  end if;
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  with base as materialized (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.cnpj, u.municipio_nome, u.uf, u.valor_estimado, u.encerramento_em,
           u.publicada_em, u.situacao_id, a.pontuacao
    from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u
    cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
    where not exists (select 1 from public.salvos s where s.user_id = p_user and s.contratacao_id = u.id and s.status = 'descartado')
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'novas', (select count(*) from base b where b.publicada_em > v_semana),
    'prazo_proximo', (select count(*) from base b where b.encerramento_em < v_prazo),
    'valor_total', (select coalesce(sum(nullif(b.valor_estimado, 0)), 0) from base b),
    'com_valor', (select count(*) from base b where b.valor_estimado > 0),
    'novos', coalesce((select jsonb_agg(to_jsonb(x) order by x.pontuacao desc, x.encerramento_em, x.id) from (
        select b.id, b.slug, b.objeto, b.orgao_nome, b.municipio_nome, b.uf, b.valor_estimado, b.encerramento_em, b.situacao_id, b.pontuacao
        from base b where b.publicada_em > v_semana order by b.pontuacao desc, b.encerramento_em, b.id limit 10) x), '[]'::jsonb),
    'encerrando', coalesce((select jsonb_agg(to_jsonb(x) order by x.encerramento_em, x.id) from (
        select b.id, b.slug, b.objeto, b.orgao_nome, b.municipio_nome, b.uf, b.valor_estimado, b.encerramento_em, b.situacao_id, b.pontuacao
        from base b where b.encerramento_em < v_prazo order by b.encerramento_em, b.id limit 5) x), '[]'::jsonb),
    'orgaos', coalesce((select jsonb_agg(to_jsonb(x) order by x.qtd desc, x.nome) from (
        select b.orgao_nome as nome, b.uf, count(*) as qtd, coalesce(sum(nullif(b.valor_estimado, 0)), 0) as valor
        from base b group by b.cnpj, b.orgao_nome, b.uf order by count(*) desc, b.orgao_nome limit 5) x), '[]'::jsonb),
    'cidades', coalesce((select jsonb_agg(to_jsonb(x) order by x.qtd desc, x.nome) from (
        select b.municipio_nome as nome, b.uf, count(*) as qtd
        from base b where b.municipio_nome is not null group by b.municipio_nome, b.uf order by count(*) desc, b.municipio_nome limit 5) x), '[]'::jsonb)
  ) into v_resumo;
  return v_resumo;
end $$;

-- Link "Parar o resumo semanal" (sem login; o site só chama com o id de um token assinado). true = havia perfil.
create function public.parar_resumo_semanal(p_user uuid)
returns boolean language sql as $$
  update public.perfis set resumo_semanal = false where id = p_user returning true
$$;

-- Descartados somem do Meu Radar: buscar_editais e radar_contagens ganham p_sem_ids (assinaturas antigas saem antes).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean);
drop function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz);

-- Lista (0014 + p_sem_ids: os descartados da conta ficam de fora antes do total e da página).
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null,
  p_termos text[] default null, p_relacionados text[] default null, p_excluir text[] default null,
  p_ordem text default null,
  p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null,
  p_sem_ids text[] default null)
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
      from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp) u
      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
      where p_sem_ids is null or u.id <> all(p_sem_ids)
      order by a.pontuacao desc, u.encerramento_em, u.id
      limit p_limite offset p_deslocamento;
  else
    return query
      with pagina as (
        select u.*, count(*) over () as total_da_busca
        from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp) u
        where p_sem_ids is null or u.id <> all(p_sem_ids)
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

-- Cartões do Meu Radar (0014 + p_sem_ids).
create function public.radar_contagens(
  p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null,
  p_desde timestamptz default null, p_sem_ids text[] default null)
returns table (total bigint, novas bigint, prazo_proximo bigint)
language sql stable as $$
  with t as materialized (
    select public.consulta_termos(coalesce(p_termos, '{}'::text[]) || coalesce(p_relacionados, '{}'::text[])) as tq,
           public.consulta_termos(p_excluir) as tq_excluir
  )
  select count(*),
         count(*) filter (where p_desde is not null and u.publicada_em > p_desde),
         count(*) filter (where u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => 7 + 1)) at time zone 'America/Sao_Paulo')
  from t
  cross join lateral public.abertas_unicas(t.tq, t.tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u
  where p_sem_ids is null or u.id <> all(p_sem_ids)
$$;

-- 5. Retenção (0006/0009/0015): contratação salva fica (descartada sai junto com ela); alertas_enviados de
-- contratações que já saíram e históricos de envio com mais de 180 dias também saem. Devolve quantas contratações apagou.
create or replace function public.aplicar_retencao()
returns bigint language sql as $$
  delete from public.uso_diario where dia < (now() at time zone 'America/Sao_Paulo')::date;
  delete from public.checkouts where criado_em < now() - interval '30 days';
  delete from public.cakto_eventos where recebido_em < now() - interval '180 days';
  delete from public.envios_alerta where iniciado_em < now() - interval '180 days';
  delete from public.envios_resumo where iniciado_em < now() - interval '180 days';
  delete from public.alertas_enviados e where not exists (select 1 from public.contratacoes c where c.id = e.contratacao_id);
  delete from public.salvos s using public.contratacoes c
   where s.contratacao_id = c.id and s.status = 'descartado'
     and (c.encerramento_em is null or c.encerramento_em < now() - interval '7 days');
  with apagadas as (
    delete from public.contratacoes c
    where (c.encerramento_em is null or c.encerramento_em < now() - interval '7 days')
      and not exists (select 1 from public.salvos s where s.contratacao_id = c.id)
    returning 1
  )
  select count(*) from apagadas
$$;

-- 6. Eventos (sem e-mail no detalhe), gravados só pelo servidor e pelo job dos alertas.
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso',
                  'limite_atingido', 'conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto', 'assinou',
                  'edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado'));

-- Só o servidor (service_role) executa.
revoke execute on function public.plano_da_conta(uuid) from public, anon, authenticated;
revoke execute on function public.gravar_salvo(uuid, text, text, int) from public, anon, authenticated;
revoke execute on function public.salvos_da_conta(uuid) from public, anon, authenticated;
revoke execute on function public.alertas_para_envio() from public, anon, authenticated;
revoke execute on function public.editais_do_alerta(uuid, timestamptz, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, int) from public, anon, authenticated;
revoke execute on function public.registrar_envio_alerta(uuid, text, int, int, text, text, text[], timestamptz, boolean) from public, anon, authenticated;
revoke execute on function public.contas_para_resumo() from public, anon, authenticated;
revoke execute on function public.resumo_do_radar(uuid, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean) from public, anon, authenticated;
revoke execute on function public.parar_resumo_semanal(uuid) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[]) from public, anon, authenticated;
revoke execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz, text[]) from public, anon, authenticated;
revoke execute on function public.aplicar_retencao() from public, anon, authenticated;
grant execute on function public.plano_da_conta(uuid) to service_role;
grant execute on function public.gravar_salvo(uuid, text, text, int) to service_role;
grant execute on function public.salvos_da_conta(uuid) to service_role;
grant execute on function public.alertas_para_envio() to service_role;
grant execute on function public.editais_do_alerta(uuid, timestamptz, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, int) to service_role;
grant execute on function public.registrar_envio_alerta(uuid, text, int, int, text, text, text[], timestamptz, boolean) to service_role;
grant execute on function public.contas_para_resumo() to service_role;
grant execute on function public.resumo_do_radar(uuid, text[], text[], text[], text[], text[], numeric, numeric, int[], boolean) to service_role;
grant execute on function public.parar_resumo_semanal(uuid) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[]) to service_role;
grant execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz, text[]) to service_role;
grant execute on function public.aplicar_retencao() to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
