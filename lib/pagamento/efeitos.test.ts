import { describe, expect, it } from 'vitest';
import { type Assinatura, efeitoDoEvento } from './efeitos';

const AGORA = new Date('2026-10-18T12:00:00Z');
const PAGO = '2026-10-18T12:00:00.000Z';
const base = { status: 'paid', pagoEm: PAGO, plano: 'basic' as const, periodo: 'mensal' as const, atual: null, agora: AGORA };
const atual = (validoAte: string, status: Assinatura['status'] = 'ativa'): Assinatura => ({ plano: 'basic', periodo: 'mensal', status, validoAte });

describe('efeitoDoEvento', () => {
  it('compra aprovada sem assinatura: cria com 31 dias + 3 de folga (mensal)', () => {
    expect(efeitoDoEvento({ ...base, evento: 'purchase_approved' })).toEqual({
      tipo: 'criar', plano: 'basic', periodo: 'mensal', validoAte: '2026-11-21T12:00:00.000Z',
    });
  });
  it('anual: 366 dias + 3', () => {
    expect(efeitoDoEvento({ ...base, evento: 'purchase_approved', periodo: 'anual' })).toMatchObject({ validoAte: '2027-10-22T12:00:00.000Z' });
  });
  it('compra aprovada com outro status não faz nada', () => {
    expect(efeitoDoEvento({ ...base, evento: 'purchase_approved', status: 'waiting_payment' })).toEqual({ tipo: 'nada' });
  });
  it('sem data de pagamento usa agora', () => {
    expect(efeitoDoEvento({ ...base, evento: 'purchase_approved', pagoEm: null })).toMatchObject({ validoAte: '2026-11-21T12:00:00.000Z' });
  });
  it('compra aprovada de uma assinatura que já existe estende', () => {
    expect(efeitoDoEvento({ ...base, evento: 'purchase_approved', atual: atual('2026-10-20T00:00:00.000Z') })).toEqual({
      tipo: 'estender', validoAte: '2026-11-23T00:00:00.000Z',
    });
  });
  it('renovação antes de vencer soma a partir da validade atual', () => {
    expect(efeitoDoEvento({ ...base, evento: 'subscription_renewed', atual: atual('2026-10-20T00:00:00.000Z') })).toEqual({
      tipo: 'estender', validoAte: '2026-11-23T00:00:00.000Z',
    });
  });
  it('renovação depois de vencida soma a partir do pagamento', () => {
    expect(efeitoDoEvento({ ...base, evento: 'subscription_renewed', atual: atual('2026-10-01T00:00:00.000Z') })).toEqual({
      tipo: 'estender', validoAte: '2026-11-21T12:00:00.000Z',
    });
  });
  it('renovação sem assinatura conhecida cria', () => {
    expect(efeitoDoEvento({ ...base, evento: 'subscription_renewed' })).toMatchObject({ tipo: 'criar' });
  });
  it('cancelamento mantém a validade; reembolso e chargeback cortam agora', () => {
    expect(efeitoDoEvento({ ...base, evento: 'subscription_canceled', atual: atual('2026-11-01T00:00:00.000Z') })).toEqual({ tipo: 'cancelar' });
    expect(efeitoDoEvento({ ...base, evento: 'refund', atual: atual('2026-11-01T00:00:00.000Z') })).toEqual({ tipo: 'estornar', validoAte: AGORA.toISOString() });
    expect(efeitoDoEvento({ ...base, evento: 'chargeback', atual: atual('2026-11-01T00:00:00.000Z') })).toEqual({ tipo: 'estornar', validoAte: AGORA.toISOString() });
  });
  it('cancelar, estornar ou renovar sem nada: cancelar/estornar sem assinatura não faz nada', () => {
    expect(efeitoDoEvento({ ...base, evento: 'subscription_canceled' })).toEqual({ tipo: 'nada' });
    expect(efeitoDoEvento({ ...base, evento: 'refund' })).toEqual({ tipo: 'nada' });
  });
  it.each(['subscription_late', 'subscription_renewal_refused', 'purchase_refused', 'subscription_created', 'pix_gerado'])(
    '%s só registra',
    (evento) => expect(efeitoDoEvento({ ...base, evento, atual: atual('2026-11-01T00:00:00.000Z') })).toEqual({ tipo: 'nada' }),
  );
});
