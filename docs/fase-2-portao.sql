-- Portão da Fase 2: "10 PMEs usaram, 3 pediram alerta" (sem acessos internos).
-- Rodar no SQL Editor do Supabase (projeto edital-map).
select
  (select count(distinct visitante) from public.eventos where tipo = 'busca' and not interno) as visitantes_com_busca,
  (select count(distinct lower(email)) from public.pedidos_alerta where not interno) as emails_com_alerta,
  (select count(distinct visitante) from public.eventos where tipo = 'abriu_edital' and not interno) as visitantes_que_abriram_edital,
  (select coalesce(json_object_agg(recurso, visitantes), '{}'::json) from (
     select detalhe ->> 'recurso' as recurso, count(distinct visitante) as visitantes
     from public.eventos where tipo = 'quer_recurso' and not interno group by 1) r) as interesse_por_recurso;
