-- SEO por município: quantos editais abertos cada município tem (mesma regra de "aberta" e de duplicatas de
-- abertas_unicas, 0011/0014). O site escolhe as cidades das páginas /licitacoes/{uf}/{cidade} (lib/seo/municipios.ts).
create function public.municipios_abertos()
returns table (codigo_ibge text, nome text, uf text, total bigint) language sql stable as $$
  select a.codigo_ibge, m.nome, m.uf, count(*)::bigint
  from public.abertas_unicas(null, null) a
  join public.municipios m on m.codigo_ibge = a.codigo_ibge
  group by a.codigo_ibge, m.nome, m.uf
$$;

revoke execute on function public.municipios_abertos() from public, anon, authenticated;
grant execute on function public.municipios_abertos() to service_role;

notify pgrst, 'reload schema';
