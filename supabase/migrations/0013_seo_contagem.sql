-- abertos_por_uf (0012) levava 28 s com os termos de um assunto: em SQL a consulta de texto entrava como expressão na
-- abertas_unicas e era refeita por linha. Em plpgsql ela é montada uma vez, como em buscar_editais (0011).
create or replace function public.abertos_por_uf(p_termos text[] default '{}', p_relacionados text[] default '{}',
                                                 p_excluir text[] default '{}')
returns table (uf text, total bigint) language plpgsql stable set plan_cache_mode = force_custom_plan as $$
#variable_conflict use_column
declare
  v_tq tsquery := public.consulta_termos(coalesce(p_termos, '{}') || coalesce(p_relacionados, '{}'));
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
begin
  return query
    select a.uf, count(*)::bigint
    from public.abertas_unicas(v_tq, v_tq_excluir) a
    group by a.uf;
end;
$$;
