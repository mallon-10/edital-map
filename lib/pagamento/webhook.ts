import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Webhook da Cakto (https://docs.cakto.com.br/conceitos/webhooks). Porte do adaptador do projeto Oferta Kids
 * (src/core/payments/cakto.ts). `X-Cakto-Signature: v1=<hex>` é o HMAC-SHA256, com o segredo do webhook, de
 * "<X-Cakto-Timestamp>.<corpo cru>"; sem os cabeçalhos, o mesmo segredo vem no campo `secret` do corpo.
 */

/** Entrega capturada não vale depois disto. */
const TOLERANCIA_MS = 5 * 60_000;

const objeto = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);

function iguais(a: string | null, b: string): boolean {
  if (a === null) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function webhookAutentico(p: {
  corpoCru: string;
  corpo: unknown;
  assinatura: string | null;
  timestamp: string | null;
  segredo: string;
  agora: Date;
}): boolean {
  if (p.assinatura === null && p.timestamp === null) return iguais(texto(objeto(p.corpo)?.secret), p.segredo);
  if (!p.assinatura || !p.timestamp) return false;
  const enviadoEm = Number(p.timestamp) * 1000;
  if (!Number.isFinite(enviadoEm) || Math.abs(p.agora.getTime() - enviadoEm) > TOLERANCIA_MS) return false;
  // Um algoritmo futuro viria como "v2=..., v1=...": compara o que conhecemos.
  const v1 = p.assinatura.split(',').map((s) => s.trim()).find((s) => s.startsWith('v1=')) ?? null;
  const esperado = createHmac('sha256', p.segredo).update(`${p.timestamp}.`).update(p.corpoCru).digest('hex');
  return iguais(v1, `v1=${esperado}`);
}

export type PedidoCakto = {
  evento: string;
  pedido: string;
  status: string | null;
  ofertaId: string | null;
  assinaturaCakto: string | null;
  email: string | null;
  valorCentavos: number | null;
  pagoEm: string | null;
  callback: string | null;
};

/** Pedidos de uma entrega: `data` é um objeto (V1) ou uma lista (V2). Abandono de checkout não tem pedido. */
export function lerPedidos(corpo: unknown): PedidoCakto[] {
  const c = objeto(corpo);
  const evento = texto(c?.event);
  if (!c || !evento || evento === 'checkout_abandonment') return [];
  const itens = Array.isArray(c.data) ? c.data : [c.data];
  const pedidos: PedidoCakto[] = [];
  for (const item of itens) {
    const d = objeto(item);
    const pedido = texto(d?.id);
    if (!d || !pedido) continue;
    const valor = d.amount === null || d.amount === undefined ? NaN : Number(d.amount);
    pedidos.push({
      evento,
      pedido,
      status: texto(d.status),
      ofertaId: texto(objeto(d.offer)?.id),
      assinaturaCakto: texto(objeto(d.subscription)?.id),
      email: texto(objeto(d.customer)?.email)?.toLowerCase() ?? null,
      valorCentavos: Number.isFinite(valor) ? Math.round(valor * 100) : null,
      pagoEm: texto(d.paidAt),
      callback: texto(d.callback),
    });
  }
  return pedidos;
}
