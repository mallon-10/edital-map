import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { lerPedidos, webhookAutentico } from './webhook';

const SEGREDO = 'segredo-do-webhook';
const AGORA = new Date('2026-10-18T12:00:00Z');
const TS = String(Math.floor(AGORA.getTime() / 1000));

const assinar = (ts: string, corpo: string) => `v1=${createHmac('sha256', SEGREDO).update(`${ts}.`).update(corpo).digest('hex')}`;

const pedido = (extra: Record<string, unknown> = {}) => ({
  id: 'ped-1', status: 'paid', amount: 49.9, paidAt: '2026-10-18T11:59:00-03:00', callback: 'abc123',
  customer: { name: 'Fulano', email: 'Fulano@Exemplo.com', docNumber: '12345678909' },
  offer: { id: 't8o4sst', price: 49.9 }, subscription: null, ...extra,
});

describe('webhookAutentico', () => {
  const corpoCru = JSON.stringify({ secret: SEGREDO, event: 'purchase_approved', data: pedido() });
  const base = { corpoCru, corpo: JSON.parse(corpoCru), segredo: SEGREDO, agora: AGORA };

  it('assinatura certa no cabeçalho passa', () => {
    expect(webhookAutentico({ ...base, assinatura: assinar(TS, corpoCru), timestamp: TS })).toBe(true);
  });
  it('aceita a lista com uma versão futura', () => {
    expect(webhookAutentico({ ...base, assinatura: `v2=xyz, ${assinar(TS, corpoCru)}`, timestamp: TS })).toBe(true);
  });
  it('corpo adulterado falha', () => {
    expect(webhookAutentico({ ...base, corpoCru: corpoCru.replace('49.9', '0.1'), assinatura: assinar(TS, corpoCru), timestamp: TS })).toBe(false);
  });
  it('entrega de 6 minutos atrás falha (reenvio de captura)', () => {
    const velho = String(Number(TS) - 6 * 60);
    expect(webhookAutentico({ ...base, assinatura: assinar(velho, corpoCru), timestamp: velho })).toBe(false);
  });
  it('cabeçalho sem v1 falha', () => {
    expect(webhookAutentico({ ...base, assinatura: 'v2=abc', timestamp: TS })).toBe(false);
  });
  it('só um dos cabeçalhos falha', () => {
    expect(webhookAutentico({ ...base, assinatura: assinar(TS, corpoCru), timestamp: null })).toBe(false);
  });
  it('sem cabeçalhos: compara o secret do corpo', () => {
    expect(webhookAutentico({ ...base, assinatura: null, timestamp: null })).toBe(true);
    expect(webhookAutentico({ ...base, corpo: { ...base.corpo, secret: 'errado' }, assinatura: null, timestamp: null })).toBe(false);
    expect(webhookAutentico({ ...base, corpo: { event: 'x' }, assinatura: null, timestamp: null })).toBe(false);
  });
});

describe('lerPedidos', () => {
  it('pedido único', () => {
    expect(lerPedidos({ event: 'purchase_approved', data: pedido() })).toEqual([
      {
        evento: 'purchase_approved', pedido: 'ped-1', status: 'paid', ofertaId: 't8o4sst', assinaturaCakto: null,
        email: 'fulano@exemplo.com', valorCentavos: 4990, pagoEm: '2026-10-18T11:59:00-03:00', callback: 'abc123',
      },
    ]);
  });
  it('lista (webhook V2) e assinatura da Cakto', () => {
    const r = lerPedidos({ event: 'subscription_renewed', data: [pedido({ id: 'a', subscription: { id: 'sub_1' } }), pedido({ id: 'b' })] });
    expect(r.map((p) => [p.pedido, p.assinaturaCakto])).toEqual([['a', 'sub_1'], ['b', null]]);
  });
  it('abandono de checkout e itens sem id são ignorados', () => {
    expect(lerPedidos({ event: 'checkout_abandonment', data: { customerEmail: 'x@y.z' } })).toEqual([]);
    expect(lerPedidos({ event: 'purchase_approved', data: { status: 'paid' } })).toEqual([]);
    expect(lerPedidos(null)).toEqual([]);
    expect(lerPedidos({ data: pedido() })).toEqual([]);
  });
  it('callback e valor ausentes viram null', () => {
    const [p] = lerPedidos({ event: 'refund', data: pedido({ callback: null, amount: null, paidAt: null }) });
    expect([p.callback, p.valorCentavos, p.pagoEm]).toEqual([null, null, null]);
  });
});
