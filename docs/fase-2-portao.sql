-- Portão da Fase 2: "10 PMEs usaram, 3 pediram alerta" (sem acessos internos).
-- Rodar no SQL Editor do Supabase (projeto edital-map).
-- Exclui por inteiro quem já apareceu como interno (o que o dono fez antes de marcar o navegador, ou em outro domínio, também sai).
-- Desde a iteração visual, o evento busca sai a cada busca ou mudança de filtro (valor, modalidade, prazo, cidade): qualquer filtro conta como uso.
-- Depois de marcar o navegador (/sobre?interno=1), o dono deve fazer uma busca, para o id de visitante dele ficar gravado como interno.
-- Recursos Pro (desde a 0007): uso_por_recurso = visitantes e vezes por recurso (relacionados_clique, filtro_orgao, filtro_raio, exportou).
with internos as (
  select visitante from public.eventos where interno
  union
  select visitante from public.pedidos_alerta where interno and visitante is not null
)
select
  (select count(distinct visitante) from public.eventos
     where tipo = 'busca' and not interno and visitante not in (select visitante from internos)) as visitantes_com_busca,
  (select count(distinct lower(email)) from public.pedidos_alerta
     where not interno and (visitante is null or visitante not in (select visitante from internos))) as emails_com_alerta,
  (select count(distinct visitante) from public.eventos
     where tipo = 'abriu_edital' and not interno and visitante not in (select visitante from internos)) as visitantes_que_abriram_edital,
  (select coalesce(json_object_agg(recurso, visitantes), '{}'::json) from (
     select detalhe ->> 'recurso' as recurso, count(distinct visitante) as visitantes
     from public.eventos
     where tipo = 'quer_recurso' and not interno and visitante not in (select visitante from internos)
     group by 1) r) as interesse_por_recurso,
  (select coalesce(json_object_agg(recurso, json_build_object('visitantes', visitantes, 'vezes', vezes)), '{}'::json) from (
     select detalhe ->> 'recurso' as recurso, count(distinct visitante) as visitantes, count(*) as vezes
     from public.eventos
     where tipo = 'usou_recurso' and not interno and visitante not in (select visitante from internos)
     group by 1) u) as uso_por_recurso;
