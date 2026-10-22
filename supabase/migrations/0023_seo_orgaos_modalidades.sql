-- Edital Map · SEO pelos dados (22/10/2026). Contagens para as páginas /licitacoes por modalidade e por órgão, com a
-- mesma regra de aberta e de duplicada de abertas_unicas (0014). O site guarda as duas por 1 h (lib/servidor/consultas.ts).
-- 1. abertos_por_modalidade(): editais abertos por modalidade e UF (páginas /licitacoes/{modalidade}[/{uf}] e sitemap).
-- 2. orgaos_abertos_lista(): órgãos com editais abertos, com o nome mais recente, a UF e a cidade mais frequentes
--    (lib/seo/orgaos.ts escolhe quem tem página; a prefeitura fica com a página da cidade).

set local lock_timeout = '10s';

create function public.abertos_por_modalidade()
returns table (modalidade_id int, uf text, total bigint) language sql stable as $$
  select a.modalidade_id, a.uf, count(*)::bigint
  from public.abertas_unicas(null, null) a
  group by a.modalidade_id, a.uf
$$;

create function public.orgaos_abertos_lista()
returns table (cnpj text, nome text, uf text, codigo_ibge text, total bigint) language sql stable as $$
  select a.cnpj,
         (array_agg(a.orgao_nome order by a.atualizada_pncp_em desc nulls last, a.id))[1],
         mode() within group (order by a.uf),
         mode() within group (order by a.codigo_ibge),
         count(*)::bigint
  from public.abertas_unicas(null, null) a
  where nullif(trim(a.orgao_nome), '') is not null
  group by a.cnpj
  order by a.cnpj
$$;

revoke execute on function public.abertos_por_modalidade() from public, anon, authenticated;
revoke execute on function public.orgaos_abertos_lista() from public, anon, authenticated;
grant execute on function public.abertos_por_modalidade() to service_role;
grant execute on function public.orgaos_abertos_lista() to service_role;

notify pgrst, 'reload schema';
