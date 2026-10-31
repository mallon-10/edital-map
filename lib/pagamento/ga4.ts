import type { Periodo } from '../planos';

/**
 * Compra enviada ao GA4 pelo servidor (Measurement Protocol), para contar a assinatura mesmo quando a pessoa não volta
 * ao /obrigado (Pix pago no celular, aba fechada). O GA4 ligado ao Google Ads leva a conversão para as campanhas.
 * Só com o consentimento do aviso de cookies.
 */
export type DadosGa4 = { cliente: string | null; sessao: string | null; consentimento: boolean };

const CLIENTE = /^\d{1,20}\.\d{1,20}$/;
const SESSAO = /^\d{1,20}$/;

export function lerDadosGa4(v: unknown): DadosGa4 {
  const o = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const cliente = typeof o.cliente === 'string' && CLIENTE.test(o.cliente) ? o.cliente : null;
  const sessao = typeof o.sessao === 'string' && SESSAO.test(o.sessao) ? o.sessao : null;
  return { cliente, sessao, consentimento: o.consentimento === true };
}

export function corpoCompraGa4(p: { cliente: string; sessao: string | null; codigo: string; valorCentavos: number; periodo: Periodo }) {
  const valor = p.valorCentavos / 100;
  const params: Record<string, unknown> = {
    transaction_id: p.codigo,
    value: valor,
    currency: 'BRL',
    // Sem tempo de engajamento o GA4 não liga o evento a uma sessão ativa.
    engagement_time_msec: 1,
    items: [{ item_id: `pro_${p.periodo}`, item_name: `Edital Map Pro ${p.periodo}`, price: valor, quantity: 1 }],
  };
  if (p.sessao) params.session_id = p.sessao;
  // `purchase` é o que o Google Ads importa; `purchase_completed` fecha o funil comercial (lib/rastreio.ts).
  const funil: Record<string, unknown> = { plano: p.periodo, value: valor, currency: 'BRL', engagement_time_msec: 1 };
  if (p.sessao) funil.session_id = p.sessao;
  return { client_id: p.cliente, events: [{ name: 'purchase', params }, { name: 'purchase_completed', params: funil }] };
}
