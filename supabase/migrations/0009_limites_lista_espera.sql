-- Edital Map · Fase 3 · Limites do grátis (3 buscas e 3 editais por dia, por navegador) e lista de espera de /planos.
-- uso_diario + registrar_uso (conta e decide numa chamada só), uso_do_dia (selo), lista_espera, evento limite_atingido
-- e limpeza do uso dos dias anteriores dentro de aplicar_retencao (job retencao-contratacoes, 04h45 UTC, da 0006).
-- O site no ar não usa nada disto (continua funcionando). O site novo depende de tudo: publicar só depois.
-- Ordem: esta migração → conferências (docs/fase-3-limites.sql e npx tsx scripts/conferir-limites.ts) → vercel deploy --prod.
-- Aplicar com npm run db:aplicar (uma transação só), fora de uma rodada do sync.

set local lock_timeout = '10s';

-- Uso do dia por navegador (cookie em_visitante). O dia é o do calendário de Brasília (zera à 0h).
-- chave: hash da combinação da busca (lib/servidor/uso.ts) ou slug do edital.
create table public.uso_diario (
  visitante  uuid not null,
  dia        date not null,
  tipo       text not null check (tipo in ('busca', 'edital')),
  chave      text not null check (length(chave) between 1 and 64),
  criado_em  timestamptz not null default now(),
  primary key (visitante, dia, tipo, chave)
);

-- Registra o uso e diz se pode, numa chamada só (o servidor chama antes de entregar a lista, o mapa ou o edital).
-- Mesma chave no mesmo dia: permitido, sem contar de novo. Chave nova com o limite cheio: recusada e nada é gravado.
-- Concorrência: sem a trava, duas chamadas simultâneas com chaves novas leriam a mesma contagem (2 de 3) e as duas
-- gravariam (4): a chave primária não impede, porque as chaves são diferentes. A trava consultiva da transação
-- (por visitante e tipo) faz a segunda esperar a primeira terminar e contar de novo; cada rpc do PostgREST é uma
-- transação, então a trava some no fim da chamada. Visitantes diferentes não se esperam (salvo colisão rara do hash).
create function public.registrar_uso(p_visitante uuid, p_tipo text, p_chave text, p_limite int)
returns table (permitido boolean, usados int)
language plpgsql as $$
declare
  v_dia    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_usados int;
begin
  if p_tipo is null or p_tipo not in ('busca', 'edital') then
    raise exception 'registrar_uso: tipo inválido (%)', p_tipo;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('uso_diario:' || p_visitante::text || ':' || p_tipo, 0));
  select count(*)::int into v_usados
    from public.uso_diario u
   where u.visitante = p_visitante and u.dia = v_dia and u.tipo = p_tipo;
  if exists (select 1 from public.uso_diario u
              where u.visitante = p_visitante and u.dia = v_dia and u.tipo = p_tipo and u.chave = p_chave) then
    return query select true, v_usados;
    return;
  end if;
  if v_usados >= p_limite then
    return query select false, v_usados;
    return;
  end if;
  insert into public.uso_diario (visitante, dia, tipo, chave) values (p_visitante, v_dia, p_tipo, p_chave);
  return query select true, v_usados + 1;
end
$$;

-- Uso de hoje do navegador, para o selo ("restam 2 buscas e 1 edital hoje").
create function public.uso_do_dia(p_visitante uuid)
returns table (buscas int, editais int)
language sql stable as $$
  select (count(*) filter (where u.tipo = 'busca'))::int,
         (count(*) filter (where u.tipo = 'edital'))::int
  from public.uso_diario u
  where u.visitante = p_visitante and u.dia = (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Lista de espera dos planos pagos ("Quero o Basic" / "Quero o Pro" em /planos).
-- ip_hash: limite de envios por hora, como em pedidos_alerta.
create table public.lista_espera (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (length(email) <= 254),
  plano      text not null check (plano in ('basic', 'pro')),
  visitante  uuid,
  interno    boolean not null default false,
  ip_hash    text,
  criado_em  timestamptz not null default now()
);
create index lista_espera_ip_idx on public.lista_espera (ip_hash, criado_em);

-- Evento novo: limite_atingido (detalhe.tipo = busca | edital), gravado só pelo servidor, uma vez por dia e tipo.
alter table public.eventos drop constraint eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('busca', 'abriu_edital', 'clicou_edital_oficial', 'pediu_alerta', 'quer_recurso', 'usou_recurso', 'limite_atingido'));

-- A retenção diária (0006, job retencao-contratacoes às 04h45 UTC = 01h45 em Brasília) passa a apagar também o uso
-- dos dias anteriores. Continua devolvendo quantas contratações apagou (o job não muda).
create or replace function public.aplicar_retencao()
returns bigint language sql as $$
  delete from public.uso_diario where dia < (now() at time zone 'America/Sao_Paulo')::date;
  with apagadas as (
    delete from public.contratacoes
    where encerramento_em is null or encerramento_em < now() - interval '7 days'
    returning 1
  )
  select count(*) from apagadas
$$;

-- Só o servidor (service_role) lê, grava e executa.
alter table public.uso_diario enable row level security;
alter table public.lista_espera enable row level security;
revoke all on table public.uso_diario from public, anon, authenticated;
revoke all on table public.lista_espera from public, anon, authenticated;
grant select, insert, delete on table public.uso_diario to service_role;
grant select, insert, delete on table public.lista_espera to service_role;
revoke execute on function public.registrar_uso(uuid, text, text, int) from public, anon, authenticated;
revoke execute on function public.uso_do_dia(uuid) from public, anon, authenticated;
revoke execute on function public.aplicar_retencao() from public, anon, authenticated;
grant execute on function public.registrar_uso(uuid, text, text, int) to service_role;
grant execute on function public.uso_do_dia(uuid) to service_role;
grant execute on function public.aplicar_retencao() to service_role;

-- O PostgREST relê as funções no commit (o Supabase também relê sozinho depois de DDL; aqui fica explícito).
notify pgrst, 'reload schema';
