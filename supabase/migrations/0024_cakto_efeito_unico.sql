-- Edital Map · Webhook da Cakto: reenviar um evento que falhou agora termina o trabalho (auditoria SEC-001).
-- Antes, o registro em cakto_eventos valia como "processado" mesmo com erro depois dele: o reenvio voltava 'repetido'
-- e o cliente ficava sem o Pro, ou o estorno não valia.
-- 1. efeito, assinatura e efeito_em: o que este evento fez na assinatura, gravado na mesma transação do efeito.
-- 2. aplicado_em: o evento terminou (só então é 'repetido'). O histórico nasce aplicado.
-- 3. aplicar_efeito_cakto: aplica o efeito uma vez só; de novo, devolve o que já foi feito.
-- Aplicar com npm run db:aplicar (uma transação só), logo antes de publicar o site.

set local lock_timeout = '10s';

alter table public.cakto_eventos
  add column efeito text check (efeito in ('criar', 'estender', 'cancelar', 'estornar', 'nada')),
  add column assinatura uuid references public.assinaturas (id) on delete set null,
  add column efeito_em timestamptz,
  add column aplicado_em timestamptz;

update public.cakto_eventos set aplicado_em = recebido_em;

create function public.aplicar_efeito_cakto(
  p_pedido text, p_evento text, p_efeito text, p_assinatura uuid default null, p_valido_ate timestamptz default null,
  p_cakto_assinatura text default null, p_plano text default null, p_periodo text default null, p_email text default null,
  p_chave text default null)
returns jsonb language plpgsql as $$
declare
  v_evento public.cakto_eventos%rowtype;
  v_id uuid := p_assinatura;
begin
  perform pg_advisory_xact_lock(hashtextextended('cakto:' || p_pedido || ':' || p_evento, 0));
  select * into v_evento from public.cakto_eventos e where e.pedido = p_pedido and e.evento = p_evento;
  if not found then
    raise exception 'Evento da Cakto não registrado';
  end if;
  if v_evento.efeito_em is not null then
    return jsonb_build_object('assinatura', v_evento.assinatura, 'efeito', v_evento.efeito);
  end if;

  if p_efeito = 'criar' then
    insert into public.assinaturas (cakto_assinatura, cakto_pedido, plano, periodo, email, status, valido_ate, chave)
    values (p_cakto_assinatura, p_pedido, p_plano, p_periodo, p_email, 'ativa', p_valido_ate, p_chave)
    returning id into v_id;
  elsif p_efeito = 'estender' then
    update public.assinaturas set valido_ate = p_valido_ate, status = 'ativa', atualizado_em = now() where id = p_assinatura;
  elsif p_efeito = 'cancelar' then
    update public.assinaturas set status = 'cancelada', atualizado_em = now() where id = p_assinatura;
  elsif p_efeito = 'estornar' then
    update public.assinaturas set status = 'estornada', valido_ate = p_valido_ate, atualizado_em = now() where id = p_assinatura;
  end if;

  update public.cakto_eventos e
     set efeito = p_efeito, assinatura = v_id, efeito_em = now()
   where e.pedido = p_pedido and e.evento = p_evento;
  return jsonb_build_object('assinatura', v_id, 'efeito', p_efeito);
end $$;

revoke execute on function public.aplicar_efeito_cakto(text, text, text, uuid, timestamptz, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.aplicar_efeito_cakto(text, text, text, uuid, timestamptz, text, text, text, text, text) to service_role;

notify pgrst, 'reload schema';
