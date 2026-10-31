-- Edital Map · Panorama das licitações (31/10/2026). Números da página /panorama, com a mesma regra de aberta e de
-- duplicada de abertas_unicas. Valor por mediana, nunca por soma: um único edital com valor digitado errado no PNCP
-- (em 31/10/2026 havia um de R$ 3,5 trilhões) distorceria qualquer total. O site guarda o resultado por 1 h
-- (lib/servidor/panorama.ts).

set local lock_timeout = '10s';

create function public.panorama_abertos()
returns jsonb language sql stable as $$
  with a as materialized (select * from public.abertas_unicas(null, null)),
  modalidades as (
    select modalidade_id, count(*)::bigint as total,
           percentile_cont(0.5) within group (order by valor_estimado) filter (where valor_estimado > 0) as mediana_valor
    from a group by modalidade_id
  ),
  ufs as (select uf, count(*)::bigint as total from a group by uf)
  select jsonb_build_object(
    'total', (select count(*) from a),
    'com_valor', (select count(*) from a where valor_estimado > 0),
    'mediana_valor', (select percentile_cont(0.5) within group (order by valor_estimado) from a where valor_estimado > 0),
    'encerram_7_dias', (select count(*) from a where encerramento_em <= now() + interval '7 days'),
    'publicados_7_dias', (select count(*) from a where publicada_em >= now() - interval '7 days'),
    'por_modalidade', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from modalidades m),
    'por_uf', (select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) from ufs u)
  )
$$;

revoke execute on function public.panorama_abertos() from public, anon, authenticated;
grant execute on function public.panorama_abertos() to service_role;

notify pgrst, 'reload schema';
