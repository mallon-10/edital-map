import 'server-only';
import { randomBytes } from 'node:crypto';
import type { PlanoPago } from '../eventos';
import type { StatusAssinatura } from '../pagamento/efeitos';
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
