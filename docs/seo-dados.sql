-- Conferências do SEO pelos dados (0023). Rodar no SQL Editor do Supabase.

-- 1. A soma por modalidade bate com os abertos sem duplicadas (total_editais_abertos conta as cópias, como o sitemap).
select (select sum(total) from public.abertos_por_modalidade()) as por_modalidade,
       (select count(*) from public.abertas_unicas(null, null)) as total;

-- 2. Editais abertos por modalidade no Brasil.
select modalidade_id, sum(total) from public.abertos_por_modalidade() group by 1 order by 2 desc;

-- 3. A soma por órgão também bate com o total.
select (select sum(total) from public.orgaos_abertos_lista()) as por_orgao, (select count(*) from public.abertas_unicas(null, null)) as total;

-- 4. Órgãos com 10+ editais abertos que não são prefeitura (os que entram no sitemap).
select count(*) from public.orgaos_abertos_lista()
where total >= 10 and public.sem_acento(upper(nome)) !~ '^(MUNICIPIO DE|PREFEITURA)';

-- 5. Tempo das duas funções (o site guarda por 1 h).
explain analyze select * from public.orgaos_abertos_lista();
