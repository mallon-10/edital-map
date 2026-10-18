import { describe, expect, it } from 'vitest';
import type { Comprador } from './comprador';
import { corpoCartao, corpoPix, lerCobranca, lerDadosCartao } from './cobranca';

const COMPRADOR: Comprador = { nome: 'Maria da Silva', email: 'maria@exemplo.com', celular: '5511999998888', tipoDocumento: 'cpf', documento: '52998224725' };
const CODIGO = 'a'.repeat(32);
const FP = 'fp-6f1c2a3b';

describe('corpos das cobranças', () => {
  it('Pix Automático: uma oferta, comprador, expiração de 10 min e o código no sck', () => {
    expect(corpoPix('irpv92e', COMPRADOR, CODIGO, FP)).toEqual({
      paymentMethod: 'pix_auto',
      customer: { name: 'Maria da Silva', email: 'maria@exemplo.com', phone: '5511999998888', docType: 'cpf', docNumber: '52998224725', fingerprint: FP },
      items: [{ offerId: 'irpv92e', quantity: 1, offerType: 'main' }],
      pixExpiresIn: 600,
      metadata: { sck: CODIGO },
    });
  });
  it('cartão 3DS: token, autenticação e referência antifraude', () => {
    const corpo = corpoCartao('iuy9gzb', COMPRADOR, CODIGO, FP, {
      token: 'tok_1', threeDSecure: { cavv: 'c', eci: '05', xid: 'x', referenceId: 'r', version: '2.2.0' }, antifraude: 'af-1',
    });
    expect(corpo).toMatchObject({
      paymentMethod: 'threeDs',
      items: [{ offerId: 'iuy9gzb', quantity: 1, offerType: 'main' }],
      card: { token: 'tok_1' },
      threeDSecure: { cavv: 'c', eci: '05', xid: 'x', referenceId: 'r', version: '2.2.0' },
      antifraud_profiling_attempt_reference: 'af-1',
      installments: 1,
      metadata: { sck: CODIGO },
    });
    expect(corpo).not.toHaveProperty('pixExpiresIn');
  });
});

describe('lerDadosCartao (o que o navegador manda)', () => {
  it('aceita só token, 3DS e antifraude; nada de número ou CVV', () => {
    expect(
      lerDadosCartao({ token: 'tok_1', threeDSecure: { cavv: 'c', eci: '05', referenceId: 'r', version: '2', extra: 'x' }, antifraude: 'af', numero: '4111' }),
    ).toEqual({ token: 'tok_1', threeDSecure: { cavv: 'c', eci: '05', xid: undefined, referenceId: 'r', version: '2' }, antifraude: 'af' });
  });
  it('sem token ou antifraude: null', () => {
    expect(lerDadosCartao({ threeDSecure: {}, antifraude: 'af' })).toBeNull();
    expect(lerDadosCartao({ token: 't' })).toBeNull();
    expect(lerDadosCartao(null)).toBeNull();
  });
});

describe('lerCobranca', () => {
  it('Pix criado: aguardando, com o copia-e-cola e a expiração', () => {
    expect(lerCobranca({ id: 'p1', status: 'waiting_payment', pix: { qrCode: '000201...', expirationDate: '2026-10-18 15:10:00+00:00' } })).toEqual({
      pedido: 'p1', estado: 'aguardando', qrCode: '000201...', expiraEm: '2026-10-18T15:10:00.000Z',
    });
  });
  it('cartão: pago, recusado ou processando', () => {
    expect(lerCobranca({ id: 'c1', status: 'paid' })).toEqual({ pedido: 'c1', estado: 'pago', qrCode: null, expiraEm: null });
    expect(lerCobranca({ id: 'c2', status: 'declined' }).estado).toBe('recusado');
    expect(lerCobranca({ id: 'c3', status: 'refused' }).estado).toBe('recusado');
    expect(lerCobranca({ id: 'c4', status: 'pending' }).estado).toBe('processando');
  });
  it('copia-e-cola longo chega inteiro', () => {
    const longo = '00020126'.padEnd(400, '7');
    expect(lerCobranca({ id: 'p2', status: 'waiting_payment', pix: { qrCode: longo } }).qrCode).toBe(longo);
  });
  it('resposta sem id: erro', () => {
    expect(() => lerCobranca({ status: 'paid' })).toThrow();
  });
});
