import type { PlanoPago } from '../eventos';
import type { Periodo } from '../planos';

/** Duração de cada período e a folga para as retentativas de cobrança da Cakto (spec do pagamento, §4). */
export const DIAS_PERIODO: Record<Periodo, number> = { mensal: 31, anual: 366 };
export const FOLGA_DIAS = 3;
const DIA_MS = 86_400_000;

export type StatusAssinatura = 'ativa' | 'cancelada' | 'estornada';
export type Assinatura = { plano: PlanoPago; periodo: Periodo; status: StatusAssinatura; validoAte: string };

export type Efeito =
  | { tipo: 'criar'; plano: PlanoPago; periodo: Periodo; validoAte: string }
  | { tipo: 'estender'; validoAte: string }
  | { tipo: 'cancelar' }
  | { tipo: 'estornar'; validoAte: string }
  | { tipo: 'nada' };

const somarPeriodo = (inicio: number, periodo: Periodo) => new Date(inicio + (DIAS_PERIODO[periodo] + FOLGA_DIAS) * DIA_MS).toISOString();

/** O que um evento da Cakto faz com a assinatura (puro: o banco aplica o resultado). */
export function efeitoDoEvento(p: {
  evento: string;
  status: string | null;
  pagoEm: string | null;
  plano: PlanoPago;
  periodo: Periodo;
  atual: Assinatura | null;
  agora: Date;
}): Efeito {
  const pago = p.pagoEm && Number.isFinite(Date.parse(p.pagoEm)) ? Date.parse(p.pagoEm) : p.agora.getTime();
  const pagamento = (p.evento === 'purchase_approved' && p.status === 'paid') || p.evento === 'subscription_renewed';
  if (pagamento) {
    if (!p.atual) return { tipo: 'criar', plano: p.plano, periodo: p.periodo, validoAte: somarPeriodo(pago, p.periodo) };
    // Renovar antes de vencer não perde os dias que faltavam; depois de vencida, conta do pagamento.
    return { tipo: 'estender', validoAte: somarPeriodo(Math.max(Date.parse(p.atual.validoAte), pago), p.periodo) };
  }
  if (!p.atual) return { tipo: 'nada' };
  if (p.evento === 'subscription_canceled') return { tipo: 'cancelar' };
  if (p.evento === 'refund' || p.evento === 'chargeback') return { tipo: 'estornar', validoAte: p.agora.toISOString() };
  // Atraso, renovação recusada, compra recusada e criação só registram: a validade acaba sozinha (a folga cobre as retentativas).
  return { tipo: 'nada' };
}
