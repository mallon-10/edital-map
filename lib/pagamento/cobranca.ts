import type { Comprador } from './comprador';

/**
 * Cobrança direta na API da Cakto (POST /public_api/payments/; https://docs.cakto.com.br/api-reference/payments/create-3ds).
 * O `metadata` público só aceita os campos de rastreio (utm_*, sck): o código do checkout vai no `sck` e volta no
 * webhook em `data.sck`.
 */

/** QR do Pix Automático vale 10 min (a Cakto aceita no mínimo 60 s e no máximo o limite do produto). */
export const EXPIRACAO_PIX_S = 600;

type ThreeDSecure = { cavv?: string; eci?: string; xid?: string; referenceId?: string; version?: string };
export type DadosCartao = { token: string; threeDSecure: ThreeDSecure; antifraude: string };

function cliente(c: Comprador, fingerprint: string) {
  return { name: c.nome, email: c.email, phone: c.celular, docType: c.tipoDocumento, docNumber: c.documento, fingerprint };
}

const item = (oferta: string) => [{ offerId: oferta, quantity: 1, offerType: 'main' }];

export function corpoPix(oferta: string, c: Comprador, codigo: string, fingerprint: string) {
  return {
    paymentMethod: 'pix_auto',
    customer: cliente(c, fingerprint),
    items: item(oferta),
    pixExpiresIn: EXPIRACAO_PIX_S,
    metadata: { sck: codigo },
  };
}

export function corpoCartao(oferta: string, c: Comprador, codigo: string, fingerprint: string, cartao: DadosCartao) {
  return {
    paymentMethod: 'threeDs',
    customer: cliente(c, fingerprint),
    items: item(oferta),
    card: { token: cartao.token },
    threeDSecure: cartao.threeDSecure,
    antifraud_profiling_attempt_reference: cartao.antifraude,
    installments: 1,
    metadata: { sck: codigo },
  };
}

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 255) : undefined);

/** Do navegador só entram o token, os dados do 3DS e a referência antifraude (número e CVV nunca chegam aqui). */
export function lerDadosCartao(v: unknown): DadosCartao | null {
  if (typeof v !== 'object' || v === null) return null;
  const c = v as Record<string, unknown>;
  const token = texto(c.token);
  const antifraude = texto(c.antifraude);
  if (!token || !antifraude) return null;
  const t = (typeof c.threeDSecure === 'object' && c.threeDSecure !== null ? c.threeDSecure : {}) as Record<string, unknown>;
  return {
    token,
    antifraude,
    threeDSecure: { cavv: texto(t.cavv), eci: texto(t.eci), xid: texto(t.xid), referenceId: texto(t.referenceId), version: texto(t.version) },
  };
}

export type EstadoCobranca = 'aguardando' | 'pago' | 'recusado' | 'processando';
export type Cobranca = { pedido: string; estado: EstadoCobranca; qrCode: string | null; expiraEm: string | null };

const ESTADOS: Record<string, EstadoCobranca> = {
  waiting_payment: 'aguardando',
  paid: 'pago',
  declined: 'recusado',
  refused: 'recusado',
  canceled: 'recusado',
  pending: 'processando',
};

/** Resposta 201 da Cakto → o que a tela precisa. */
export function lerCobranca(r: unknown): Cobranca {
  const c = (typeof r === 'object' && r !== null ? r : {}) as Record<string, unknown>;
  const pedido = texto(c.id);
  if (!pedido) throw new Error('cobrança sem id na resposta da Cakto');
  const pix = (typeof c.pix === 'object' && c.pix !== null ? c.pix : {}) as Record<string, unknown>;
  const expira = texto(pix.expirationDate);
  const data = expira ? new Date(expira.replace(' ', 'T')) : null;
  // O BR Code passa de 255 caracteres: lido inteiro, sem o corte de `texto`.
  const qrCode = typeof pix.qrCode === 'string' && pix.qrCode.trim() ? pix.qrCode.trim() : null;
  return {
    pedido,
    // A criação do Pix Automático nem sempre volta com waiting_payment (o pedido aparece assim no painel): com QR, aguarda.
    estado: ESTADOS[String(c.status)] ?? (qrCode ? 'aguardando' : 'processando'),
    qrCode,
    expiraEm: data && Number.isFinite(data.getTime()) ? data.toISOString() : null,
  };
}
