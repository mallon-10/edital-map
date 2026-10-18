-- SEO (docs/superpowers/specs/2026-10-18-seo-design.md §6): editais abertos para o sitemap e contagem por UF para as
-- páginas /licitacoes. Mesmo filtro de "aberta" e de texto da busca (abertas_unicas e consulta_termos, 0011).

-- Por UF: termos digitados + relacionados ("qualquer um deles"), menos os excluídos. Sem termo, todas as abertas.
create function public.abertos_por_uf(p_termos text[] default '{}', p_relacionados text[] default '{}',
                                      p_excluir text[] default '{}')
returns table (uf text, total bigint) language sql stable set plan_cache_mode = force_custom_plan as $$
  select a.uf, count(*)::bigint
  from public.abertas_unicas(public.consulta_termos(coalesce(p_termos, '{}') || coalesce(p_relacionados, '{}')),
                             public.consulta_termos(p_excluir)) a
  group by a.uf
$$;

create function public.total_editais_abertos()
returns bigint language sql stable as $$
  select count(*)::bigint from public.contratacoes c where public.em_aberto(c.encerramento_em, c.situacao_id)
$$;

-- Ordem estável por id: o sitemap é lido em arquivos de 40.000 (em páginas de 1.000, o teto do PostgREST).
create function public.editais_abertos_sitemap(p_limite int, p_deslocamento int)
returns table (slug text, atualizada_pncp_em timestamptz) language sql stable as $$
  select c.slug, c.atualizada_pncp_em
  from public.contratacoes c
  where public.em_aberto(c.encerramento_em, c.situacao_id)
  order by c.id
  limit least(greatest(p_limite, 0), 50000) offset greatest(p_deslocamento, 0)
$$;

revoke execute on function public.abertos_por_uf(text[], text[], text[]) from public, anon, authenticated;
revoke execute on function public.total_editais_abertos() from public, anon, authenticated;
revoke execute on function public.editais_abertos_sitemap(int, int) from public, anon, authenticated;
grant execute on function public.abertos_por_uf(text[], text[], text[]) to service_role;
grant execute on function public.total_editais_abertos() to service_role;
grant execute on function public.editais_abertos_sitemap(int, int) to service_role;
