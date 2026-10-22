-- Edital Map · Nota mínima do Meu Radar (22/10/2026). A auditoria com perfis reais mostrou que 55% a 90% do radar
-- batia só numa palavra solta nos itens de outra compra ("uniforme" na merenda, "EPI" em livros, "pneu" em móveis).
-- Radar, contagens, alertas e resumo passam a trazer só relevância 45 ou mais: o produto no objeto do edital, ou
-- vários produtos do ramo nos itens. A busca livre da página inicial não muda (p_nota_minima nulo).
-- 1. nota_minima_radar(): 45, o mesmo NOTA_MINIMA_RADAR de lib/radar.ts (guardado em scripts/migracoes.test.ts).
-- 2. buscar_editais ganha p_nota_minima (o Meu Radar manda; a busca livre não), nas duas ordens.
-- 3. radar_contagens, editais_do_alerta e resumo_do_radar cortam pela mesma nota (assinaturas iguais, grants ficam).
-- Aplicar com npm run db:aplicar (uma transação só).

set local lock_timeout = '10s';

-- 1. A nota (uma fonte no banco)
create function public.nota_minima_radar()
returns int language sql immutable parallel safe as $$
  select 45
$$;

-- 2. Lista (0016 + p_nota_minima)
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[]);

create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null,
  p_termos text[] default null, p_relacionados text[] default null, p_excluir text[] default null,
  p_ordem text default null,
  p_ibges text[] default null, p_valor_max numeric default null, p_so_me_epp boolean default null,
  p_sem_ids text[] default null, p_nota_minima int default null)
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
      where (p_sem_ids is null or u.id <> all(p_sem_ids))
        and (p_nota_minima is null or a.pontuacao >= p_nota_minima)
      order by a.pontuacao desc, u.encerramento_em, u.id
      limit p_limite offset p_deslocamento;
  else
    -- Com nota mínima, a nota é calculada antes da página (o total e a página já vêm sem os de nota baixa).
    return query
      with pagina as (
        select u.*, count(*) over () as total_da_busca
        from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias, p_ibges, p_valor_max, p_so_me_epp) u
        where (p_sem_ids is null or u.id <> all(p_sem_ids))
          and (p_nota_minima is null or v_tq is null
               or (select n.pontuacao
                     from public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) n) >= p_nota_minima)
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

-- 3a. Cartões do Meu Radar (0016 + nota mínima). Mesma assinatura; agora calcula a nota de cada edital.
create or replace function public.radar_contagens(
  p_termos text[], p_relacionados text[] default null, p_excluir text[] default null,
  p_ufs text[] default null, p_ibges text[] default null, p_valor_min numeric default null,
  p_valor_max numeric default null, p_modalidades int[] default null, p_so_me_epp boolean default null,
  p_desde timestamptz default null, p_sem_ids text[] default null)
returns table (total bigint, novas bigint, prazo_proximo bigint)
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
  v_prazo timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => 7 + 1)) at time zone 'America/Sao_Paulo';
begin
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  return query
    select count(*),
           count(*) filter (where p_desde is not null and u.publicada_em > p_desde),
           count(*) filter (where u.encerramento_em < v_prazo)
    from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, null, null, null, null, p_ibges, p_valor_max, p_so_me_epp) u
    cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
    where (p_sem_ids is null or u.id <> all(p_sem_ids))
      and (v_tq is null or a.pontuacao >= public.nota_minima_radar());
end $$;

-- 3b. Editais de um alerta (0016 + nota mínima).
create or replace function public.editais_do_alerta(
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
    where greatest(u.sincronizada_em, u.atualizada_pncp_em) > p_desde - interval '15 minutes'
      and a.pontuacao >= public.nota_minima_radar()
      and not exists (select 1 from public.alertas_enviados e where e.alerta_id = p_alerta and e.contratacao_id = u.id)
      and not exists (select 1 from public.salvos s where s.user_id = v_user and s.contratacao_id = u.id and s.status = 'descartado')
    order by a.pontuacao desc, u.encerramento_em, u.id
    limit least(greatest(coalesce(p_limite, 20), 1), 50);
end $$;

-- 3c. Resumo semanal (0016 + nota mínima): contagens, novos, encerrando, órgãos e cidades sobre a mesma base cortada.
create or replace function public.resumo_do_radar(
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
    where a.pontuacao >= public.nota_minima_radar()
      and not exists (select 1 from public.salvos s where s.user_id = p_user and s.contratacao_id = u.id and s.status = 'descartado')
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

revoke execute on function public.nota_minima_radar() from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[], int) from public, anon, authenticated;
grant execute on function public.nota_minima_radar() to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text, text[], numeric, boolean, text[], int) to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
