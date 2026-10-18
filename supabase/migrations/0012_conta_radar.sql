-- Edital Map · Evolução · Fase 3 · Conta, onboarding e Meu Radar (0012).
-- 1. perfis: plano gratis | basic | pro (sem dados existentes) e a última visita ao Meu Radar.
-- 2. radares (um por conta): municípios (IBGE), valor máximo, só ME/EPP, atualizado_em, checagens e índice único por user_id.
-- 3. Dados da conta só pelo servidor (service_role, sempre filtrando pelo user_id da sessão validada em
--    lib/servidor/sessao.ts): as políticas da 0001 saem e anon/authenticated perdem o acesso às tabelas.
-- 4. abertas_unicas e buscar_editais ganham p_ibges, p_valor_max e p_so_me_epp (padrão nulo: as chamadas de hoje e
--    mapa_editais, que passa os 9 primeiros argumentos, seguem valendo). Corpos iguais aos da 0011 fora isso
--    (guarda em scripts/migracoes.test.ts).
-- 5. radar_contagens (os cartões do Meu Radar numa passada), exclusivo_me_epp (regra da etiqueta "Exclusivo ME/EPP"
--    do edital) e buscar_municipios (onboarding).
-- 6. Eventos da conta em eventos_tipo_check (lib/eventos.ts, TIPOS_EVENTO_CONTA).
-- Ordem: esta migração → conferências (docs/evolucao-fase-3.sql) → vercel deploy --prod. Aplicar com npm run db:aplicar.

set local lock_timeout = '10s';

-- 1. Perfil
alter table public.perfis drop constraint perfis_plano_check;
alter table public.perfis add constraint perfis_plano_check check (plano in ('gratis', 'basic', 'pro'));
alter table public.perfis add column ultima_visita_radar timestamptz;

-- 2. Radar
alter table public.radares
  add column municipios text[] not null default '{}',
  add column valor_max numeric(16,2),
  add column so_me_epp boolean not null default false,
  add column atualizado_em timestamptz not null default now();
-- Valor máximo 0 = sem máximo: o site grava null (nullif(valor, 0) <= 0 não casaria nada).
alter table public.radares
  add constraint radares_termos_check check (cardinality(termos) between 1 and 10),
  add constraint radares_excluir_check check (cardinality(termos_excluir) <= 10),
  add constraint radares_ufs_check check (cardinality(ufs) <= 27),
  add constraint radares_municipios_check check (cardinality(municipios) <= 50),
  add constraint radares_local_check check (cardinality(ufs) = 0 or cardinality(municipios) = 0),
  add constraint radares_valor_check check ((valor_min is null or valor_min >= 0) and (valor_max is null or valor_max > 0)),
  add constraint radares_faixa_check check (valor_min is null or valor_max is null or valor_min <= valor_max);
create unique index radares_user_id_key on public.radares (user_id);

-- 3. Só o servidor lê e grava os dados da conta.
drop policy "perfil próprio" on public.perfis;
drop policy "radares próprios" on public.radares;
drop policy "salvos próprios" on public.salvos;
alter table public.perfis enable row level security;
alter table public.radares enable row level security;
alter table public.salvos enable row level security;
alter table public.alertas_enviados enable row level security;
revoke all on table public.perfis from public, anon, authenticated;
revoke all on table public.radares from public, anon, authenticated;
revoke all on table public.salvos from public, anon, authenticated;
revoke all on table public.alertas_enviados from public, anon, authenticated;
grant select, insert, update, delete on table public.perfis to service_role;
grant select, insert, update, delete on table public.radares to service_role;
grant select, insert, update, delete on table public.salvos to service_role;
grant select, insert, update, delete on table public.alertas_enviados to service_role;

-- 4. Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text);
drop function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int);

-- Exclusivo para ME/EPP: todos os itens com benefício 1 (a mesma regra da etiqueta do edital). Sem resumo: false.
create function public.exclusivo_me_epp(p_resumo jsonb)
returns boolean language sql immutable parallel safe as $$
  select coalesce((p_resumo ->> 'total')::int, 0) > 0
     and coalesce((p_resumo ->> 'exclusivos')::int, 0) = (p_resumo ->> 'total')::int
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
                                      p_dias int default null,
                                      p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto)) c.*
  from public.contratacoes c
  where public.em_aberto(c.encerramento_em, c.situacao_id)
    and (p_tq is null or c.busca @@ p_tq or c.itens_palavras @@ p_tq)
    and (p_tq_excluir is null or not c.busca @@ p_tq_excluir)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_ibges is null or cardinality(p_ibges) = 0 or c.codigo_ibge = any(p_ibges))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
    and (p_valor_max is null or nullif(c.valor_estimado, 0) <= p_valor_max)
    and (p_modalidades is null or cardinality(p_modalidades) = 0 or c.modalidade_id = any(p_modalidades))
    and (p_so_me_epp is not true or public.exclusivo_me_epp(c.itens_resumo))
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
-- 0012: p_ibges (lista de municípios), p_valor_max e p_so_me_epp, repassados a abertas_unicas.
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null,
  p_termos text[] default null, p_relacionados text[] default null, p_excluir text[] default null,
  p_ordem text default null,
  p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null)
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
      order by a.pontuacao desc, u.encerramento_em, u.id
      limit p_limite offset p_deslocamento;
  else
    return query
      with pagina as (
        select u.*, count(*) over () as total_da_busca
        from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp) u
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

-- 5. Cartões do Meu Radar numa passada, sobre as mesmas abertas da lista: total, novas desde p_desde (publicação) e
-- prazo próximo (encerram até o fim do dia de hoje + 7, a mesma conta de p_dias = 7).
create function public.radar_contagens(
  p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null,
  p_desde timestamptz default null)
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
$$;

-- Municípios pelo nome, sem acento (onboarding): começo do nome primeiro, depois começo de outra palavra.
-- O site manda q já limpo (letras, espaço, hífen e apóstrofo; lib/radar.ts, lerBuscaMunicipio).
create function public.buscar_municipios(q text, p_limite int default 10)
returns table (codigo_ibge text, nome text, uf text)
language sql stable as $$
  select m.codigo_ibge, m.nome, m.uf
  from public.municipios m
  where public.sem_acento(m.nome) ilike public.sem_acento(q) || '%'
     or public.sem_acento(m.nome) ilike '% ' || public.sem_acento(q) || '%'
  order by (public.sem_acento(m.nome) ilike public.sem_acento(q) || '%') desc, m.nome, m.uf
  limit least(greatest(coalesce(p_limite, 10), 1), 20)
$$;

-- 6. Eventos da conta (sem e-mail no detalhe), gravados só pelo servidor.
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso', 'limite_atingido',
                  'conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto'));

-- Só o servidor (service_role) executa.
revoke execute on function public.exclusivo_me_epp(jsonb) from public, anon, authenticated;
revoke execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int, text[], numeric, boolean) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean) from public, anon, authenticated;
revoke execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.buscar_municipios(text, int) from public, anon, authenticated;
grant execute on function public.exclusivo_me_epp(jsonb) to service_role;
grant execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int, text[], numeric, boolean) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean) to service_role;
grant execute on function public.radar_contagens(text[], text[], text[], text[], text[], numeric, numeric, int[], boolean, timestamptz) to service_role;
grant execute on function public.buscar_municipios(text, int) to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
