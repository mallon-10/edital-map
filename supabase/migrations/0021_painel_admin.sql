-- Edital Map · Painel do dono (/admin, 20/10/2026). Spec: docs/superpowers/specs/2026-10-20-painel-admin-design.md.
-- 1. eventos.tipo ganha pagina_vista (lib/eventos.ts, TIPOS_EVENTO_NAVEGACAO): caminho da página e, na entrada, a origem.
-- 2. Retenção: página vista com mais de 400 dias sai todo dia (pg_cron retencao-eventos). Os outros tipos ficam.
-- 3. painel_admin(p_desde, p_ate): os números do painel num jsonb só, sem os eventos internos. Só o servidor executa.
-- Aplicar com npm run db:aplicar (uma transação só).

set local lock_timeout = '10s';

alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso',
                  'limite_atingido', 'conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto', 'assinou',
                  'edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado', 'pagina_vista'));

-- O painel lê por período (todos os tipos): índice pela data.
create index if not exists eventos_criado_idx on public.eventos (criado_em);

select cron.schedule('retencao-eventos', '50 4 * * *',
  $$delete from public.eventos where tipo = 'pagina_vista' and criado_em < now() - interval '400 days'$$);

-- Termos agrupados pelo texto em minúsculas e sem espaços sobrando; dias em America/Sao_Paulo.
create or replace function public.painel_admin(p_desde timestamptz, p_ate timestamptz)
returns jsonb language sql stable set search_path = public as $$
  with e as (
    select visitante, tipo, detalhe, criado_em
    from public.eventos
    where not interno and criado_em >= p_desde and criado_em < p_ate
  ),
  entradas as (select detalhe from e where tipo = 'pagina_vista' and detalhe ? 'origem'),
  buscas as (
    select visitante, lower(btrim(detalhe ->> 'q')) as termo, (detalhe ->> 'total')::int as total, detalhe ->> 'uf' as uf
    from e where tipo = 'busca'
  )
  select jsonb_build_object(
    'resumo', (
      select jsonb_build_object(
        'visitantes', count(distinct visitante),
        'visitas', count(*) filter (where tipo = 'pagina_vista' and detalhe ? 'origem'),
        'paginas', count(*) filter (where tipo = 'pagina_vista'),
        'buscas', count(*) filter (where tipo = 'busca'),
        'buscas_sem_resultado', count(*) filter (where tipo = 'busca' and detalhe ->> 'total' = '0'),
        'editais', count(*) filter (where tipo = 'abriu_edital'),
        'oficial', count(*) filter (where tipo = 'clicou_edital_oficial'),
        'exportou', count(*) filter (where tipo = 'usou_recurso' and detalhe ->> 'recurso' = 'exportou'),
        'tentou_assinar', count(*) filter (where tipo = 'usou_recurso' and detalhe ->> 'recurso' = 'tentou_assinar'),
        'contas', (select count(*) from public.perfis where criado_em >= p_desde and criado_em < p_ate),
        'assinaturas', (select count(*) from public.assinaturas where criado_em >= p_desde and criado_em < p_ate),
        'alertas', (select count(*) from public.alertas where criado_em >= p_desde and criado_em < p_ate)
      ) from e
    ),
    'por_dia', (
      select coalesce(jsonb_agg(d order by d.dia), '[]'::jsonb) from (
        select (criado_em at time zone 'America/Sao_Paulo')::date as dia,
               count(distinct visitante) as visitantes,
               count(*) filter (where tipo = 'pagina_vista') as paginas,
               count(*) filter (where tipo = 'busca') as buscas,
               count(*) filter (where tipo = 'abriu_edital') as editais
        from e group by 1
      ) d
    ),
    'origens', (
      select coalesce(jsonb_agg(o order by o.n desc), '[]'::jsonb) from (
        select detalhe ->> 'origem' as nome, count(*) as n from entradas group by 1
      ) o
    ),
    'sites', (
      select coalesce(jsonb_agg(o order by o.n desc), '[]'::jsonb) from (
        select detalhe ->> 'site' as nome, count(*) as n from entradas where detalhe ? 'site' group by 1 order by 2 desc limit 15
      ) o
    ),
    'campanhas', (
      select coalesce(jsonb_agg(o order by o.n desc), '[]'::jsonb) from (
        select detalhe ->> 'campanha' as nome, count(*) as n from entradas where detalhe ? 'campanha' group by 1 order by 2 desc limit 15
      ) o
    ),
    'paginas', (
      select coalesce(jsonb_agg(p order by p.n desc), '[]'::jsonb) from (
        select detalhe ->> 'pagina' as nome, count(*) as n, count(distinct visitante) as pessoas
        from e where tipo = 'pagina_vista' group by 1 order by 2 desc limit 25
      ) p
    ),
    'entradas', (
      select coalesce(jsonb_agg(p order by p.n desc), '[]'::jsonb) from (
        select detalhe ->> 'pagina' as nome, count(*) as n from entradas group by 1 order by 2 desc limit 15
      ) p
    ),
    'termos', (
      select coalesce(jsonb_agg(t order by t.n desc, t.termo), '[]'::jsonb) from (
        select termo, count(*) as n, count(distinct visitante) as pessoas,
               round(avg(total))::int as media, count(*) filter (where total = 0) as zeros
        from buscas where coalesce(termo, '') <> '' group by 1 order by 2 desc, 1 limit 30
      ) t
    ),
    'sem_resultado', (
      select coalesce(jsonb_agg(t order by t.n desc, t.termo), '[]'::jsonb) from (
        select termo, count(*) as n, count(distinct visitante) as pessoas
        from buscas where total = 0 and coalesce(termo, '') <> '' group by 1 order by 2 desc, 1 limit 20
      ) t
    ),
    'ufs', (
      select coalesce(jsonb_agg(u order by u.n desc), '[]'::jsonb) from (
        select uf as nome, count(*) as n from buscas where uf is not null group by 1
      ) u
    ),
    'editais_top', (
      select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
        select a.slug, a.n, a.pessoas, c.objeto, c.uf, c.municipio_nome
        from (
          select detalhe ->> 'edital' as slug, count(*) as n, count(distinct visitante) as pessoas
          from e where tipo = 'abriu_edital' group by 1 order by 2 desc limit 15
        ) a
        left join public.contratacoes c on c.slug = a.slug
      ) x
    ),
    'recursos', (
      select coalesce(jsonb_agg(r order by r.n desc), '[]'::jsonb) from (
        select tipo, detalhe ->> 'recurso' as nome, count(*) as n, count(distinct visitante) as pessoas
        from e where tipo in ('usou_recurso', 'quer_recurso') group by 1, 2
      ) r
    ),
    'funil', (
      select jsonb_build_object(
        'visitou', count(distinct visitante),
        'buscou', count(distinct visitante) filter (where tipo = 'busca'),
        'abriu_edital', count(distinct visitante) filter (where tipo = 'abriu_edital'),
        'viu_planos', count(distinct visitante) filter (where tipo = 'pagina_vista' and detalhe ->> 'pagina' = '/planos'),
        'tentou_assinar', count(distinct visitante) filter (where tipo = 'usou_recurso' and detalhe ->> 'recurso' = 'tentou_assinar'),
        'assinou', count(distinct visitante) filter (where tipo = 'assinou')
      ) from e
    )
  )
$$;

revoke execute on function public.painel_admin(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.painel_admin(timestamptz, timestamptz) to service_role;
