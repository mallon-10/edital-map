import 'server-only';
import { randomBytes } from 'node:crypto';
import type { PlanoPago } from '../eventos';
import { gerarChave } from '../pagamento/chave';
import { type ConfigPagamento, planoDaOferta } from '../pagamento/config';
import { type Assinatura, efeitoDoEvento, type StatusAssinatura } from '../pagamento/efeitos';
import type { PedidoCakto } from '../pagamento/webhook';
import type { Periodo } from '../planos';
import type { Contexto } from './registro';
import { supabaseServidor } from './supabase';

/** Pagamento pela Cakto no servidor (docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md §3–§5). */

export type AssinaturaVisivel = {
  id: string;
  plano: PlanoPago;
  periodo: Periodo;
  status: StatusAssinatura;
  validoAte: string;
  chave: string;
};

const CODIGO = /^[0-9a-f]{32}$/;
type Linha = Record<string, unknown>;

function paraAssinatura(l: Linha): AssinaturaVisivel {
  return {
    id: String(l.id),
    plano: l.plano === 'pro' ? 'pro' : 'basic',
    periodo: l.periodo === 'anual' ? 'anual' : 'mensal',
    status: l.status === 'cancelada' || l.status === 'estornada' ? l.status : 'ativa',
    validoAte: String(l.valido_ate),
    chave: String(l.chave),
  };
}

const valida = (a: AssinaturaVisivel, agora: Date) => a.status !== 'estornada' && Date.parse(a.validoAte) > agora.getTime();

/** Assinaturas válidas ligadas ao navegador, Pro primeiro. */
async function assinaturasDoVisitante(visitante: string, agora: Date): Promise<AssinaturaVisivel[]> {
  const { data, error } = await supabaseServidor()
    .from('assinatura_navegadores')
    .select('assinaturas(id, plano, periodo, status, valido_ate, chave)')
    .eq('visitante', visitante);
  if (error) throw new Error(`assinaturas do visitante: ${error.message}`);
  return ((data ?? []) as Array<{ assinaturas: Linha | Linha[] | null }>)
    .flatMap((l) => (Array.isArray(l.assinaturas) ? l.assinaturas : l.assinaturas ? [l.assinaturas] : []))
    .map(paraAssinatura)
    .filter((a) => valida(a, agora))
    .sort((a, b) => Number(b.plano === 'pro') - Number(a.plano === 'pro'));
}

export async function assinaturaDoVisitante(visitante: string, agora = new Date()): Promise<AssinaturaVisivel | null> {
  return (await assinaturasDoVisitante(visitante, agora))[0] ?? null;
}

/** Código do `?callback=` da Cakto, ligado a este navegador. Sem visitante (robô, cookie bloqueado): null. */
export async function criarCheckout(ctx: Contexto | null, plano: PlanoPago, periodo: Periodo): Promise<string | null> {
  if (!ctx) return null;
  const codigo = randomBytes(16).toString('hex');
  const { error } = await supabaseServidor().from('checkouts').insert({ codigo, visitante: ctx.visitante, plano, periodo });
  if (error) throw new Error(`criar checkout: ${error.message}`);
  return codigo;
}

export type EstadoCheckout =
  | { estado: 'pago'; plano: PlanoPago; periodo: Periodo; validoAte: string; status: StatusAssinatura; chave: string | null }
  | { estado: 'esperando' }
  | { estado: 'desconhecido' };

/** Situação de um checkout para /obrigado. A chave só aparece no navegador que fez o checkout. */
export async function estadoDoCheckout(codigo: string, visitante: string | null, agora = new Date()): Promise<EstadoCheckout> {
  if (!CODIGO.test(codigo)) return { estado: 'desconhecido' };
  const { data, error } = await supabaseServidor().from('checkouts').select('visitante, plano, periodo').eq('codigo', codigo).maybeSingle();
  if (error) throw new Error(`checkout: ${error.message}`);
  if (!data) return { estado: 'desconhecido' };
  const c = data as Linha;
  const comprada = (await assinaturasDoVisitante(String(c.visitante), agora)).find((a) => a.plano === c.plano);
  if (!comprada) return { estado: 'esperando' };
  return {
    estado: 'pago',
    plano: comprada.plano,
    periodo: comprada.periodo,
    validoAte: comprada.validoAte,
    status: comprada.status,
    chave: visitante === c.visitante ? comprada.chave : null,
  };
}

/** Liga este navegador à assinatura da chave (até 3 navegadores). */
export async function ativarChave(chave: string, visitante: string): Promise<'ok' | 'cheia' | 'invalida'> {
  const { data, error } = await supabaseServidor().from('assinaturas').select('id').eq('chave', chave).maybeSingle();
  if (error) throw new Error(`chave: ${error.message}`);
  if (!data) return 'invalida';
  const r = await supabaseServidor().rpc('ligar_navegador', { p_assinatura: String((data as Linha).id), p_visitante: visitante });
  if (r.error) throw new Error(`ligar_navegador: ${r.error.message}`);
  return r.data === 'ok' ? 'ok' : r.data === 'cheia' ? 'cheia' : 'invalida';
}

/** Assinatura atual do pedido: pela assinatura da Cakto; sem ela (pedido avulso), pelo e-mail + plano (a mais recente). */
async function assinaturaDoPedido(p: PedidoCakto, plano: PlanoPago): Promise<(Assinatura & { id: string }) | null> {
  const consulta = supabaseServidor().from('assinaturas').select('id, plano, periodo, status, valido_ate');
  let r;
  if (p.assinaturaCakto) r = await consulta.eq('cakto_assinatura', p.assinaturaCakto).maybeSingle();
  else if (p.email) r = await consulta.eq('email', p.email).eq('plano', plano).order('criado_em', { ascending: false }).limit(1).maybeSingle();
  else return null;
  if (r.error) throw new Error(`assinatura do pedido: ${r.error.message}`);
  if (!r.data) return null;
  const a = paraAssinatura({ ...(r.data as Linha), chave: '' });
  return { id: a.id, plano: a.plano, periodo: a.periodo, status: a.status, validoAte: a.validoAte };
}

/** Insere a assinatura nova; a chave é única no banco, então tenta de novo se (raramente) colidir. */
async function criarAssinatura(p: PedidoCakto, plano: PlanoPago, periodo: Periodo, validoAte: string): Promise<string> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data, error } = await supabaseServidor()
      .from('assinaturas')
      .insert({
        cakto_assinatura: p.assinaturaCakto, cakto_pedido: p.pedido, plano, periodo, email: p.email, status: 'ativa',
        valido_ate: validoAte, chave: gerarChave(),
      })
      .select('id')
      .single();
    if (!error) return String((data as Linha).id);
    if (error.code !== '23505' || !error.message.includes('chave')) throw new Error(`criar assinatura: ${error.message}`);
  }
  throw new Error('criar assinatura: chave repetida três vezes');
}

async function atualizar(id: string, valores: Record<string, unknown>, agora: Date) {
  const { error } = await supabaseServidor().from('assinaturas').update({ ...valores, atualizado_em: agora.toISOString() }).eq('id', id);
  if (error) throw new Error(`atualizar assinatura: ${error.message}`);
}

/** Navegador do checkout (código do `?callback=`), para ligar o plano nele. */
async function visitanteDoCheckout(callback: string | null): Promise<string | null> {
  if (!callback || !CODIGO.test(callback)) return null;
  const { data, error } = await supabaseServidor().from('checkouts').select('visitante').eq('codigo', callback).maybeSingle();
  if (error) throw new Error(`checkout do pedido: ${error.message}`);
  return data ? String((data as Linha).visitante) : null;
}

/** Visitante usado no evento `assinou` quando a compra não veio de um checkout do site. */
const VISITANTE_DESCONHECIDO = '00000000-0000-4000-8000-000000000000';

/**
 * Aplica um pedido do webhook da Cakto (spec do pagamento, §4). Idempotente: o par (pedido, evento) só vale uma vez.
 * O registro do evento guarda só o pedido já lido (sem cartão, documento, telefone ou endereço).
 */
export async function aplicarPedido(p: PedidoCakto, cfg: ConfigPagamento, agora: Date): Promise<'aplicado' | 'repetido' | 'ignorado'> {
  const registro = await supabaseServidor().from('cakto_eventos').insert({ pedido: p.pedido, evento: p.evento, corpo: p });
  if (registro.error) {
    if (registro.error.code === '23505') return 'repetido';
    throw new Error(`registrar evento da Cakto: ${registro.error.message}`);
  }
  const oferta = planoDaOferta(cfg, p.ofertaId);
  if (!oferta) return 'ignorado';
  const atual = await assinaturaDoPedido(p, oferta.plano);
  const efeito = efeitoDoEvento({ evento: p.evento, status: p.status, pagoEm: p.pagoEm, ...oferta, atual, agora });
  let id = atual?.id ?? null;
  if (efeito.tipo === 'criar') {
    id = await criarAssinatura(p, efeito.plano, efeito.periodo, efeito.validoAte);
  } else if (efeito.tipo === 'estender' && atual) {
    await atualizar(atual.id, { valido_ate: efeito.validoAte, status: 'ativa' }, agora);
  } else if (efeito.tipo === 'cancelar' && atual) {
    await atualizar(atual.id, { status: 'cancelada' }, agora);
  } else if (efeito.tipo === 'estornar' && atual) {
    await atualizar(atual.id, { status: 'estornada', valido_ate: efeito.validoAte }, agora);
  }
  const visitante = id ? await visitanteDoCheckout(p.callback) : null;
  if (id && visitante) {
    const r = await supabaseServidor().rpc('ligar_navegador', { p_assinatura: id, p_visitante: visitante });
    if (r.error) throw new Error(`ligar navegador do checkout: ${r.error.message}`);
  }
  if (efeito.tipo === 'criar') {
    const { error } = await supabaseServidor().from('eventos').insert({
      visitante: visitante ?? VISITANTE_DESCONHECIDO, tipo: 'assinou', interno: false,
      detalhe: { plano: efeito.plano, periodo: efeito.periodo, valor: p.valorCentavos },
    });
    if (error) console.error(`evento assinou: ${error.message}`);
  }
  return efeito.tipo === 'nada' ? 'ignorado' : 'aplicado';
}
