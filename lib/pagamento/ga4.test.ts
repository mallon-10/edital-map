import { describe, expect, it } from 'vitest';
import { corpoCompraGa4, lerDadosGa4 } from './ga4';

describe('lerDadosGa4 (o que o navegador manda)', () => {
  it('aceita client_id e session_id do GA4 e o consentimento', () => {
    expect(lerDadosGa4({ cliente: '123.456', sessao: '1729260000', consentimento: true })).toEqual({ cliente: '123.456', sessao: '1729260000', consentimento: true });
  });
  it('formatos estranhos viram null; sem aceite, consentimento falso', () => {
    expect(lerDadosGa4({ cliente: '<script>', sessao: 'x', consentimento: 'sim' })).toEqual({ cliente: null, sessao: null, consentimento: false });
    expect(lerDadosGa4(null)).toEqual({ cliente: null, sessao: null, consentimento: false });
  });
});

describe('corpoCompraGa4', () => {
  it('purchase com transação, valor em reais, moeda e sessão', () => {
    expect(corpoCompraGa4({ cliente: '123.456', sessao: '1729260000', codigo: 'abc', valorCentavos: 3790, periodo: 'mensal' })).toEqual({
      client_id: '123.456',
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: 'abc', value: 37.9, currency: 'BRL', session_id: '1729260000', engagement_time_msec: 1,
            items: [{ item_id: 'pro_mensal', item_name: 'Edital Map Pro mensal', price: 37.9, quantity: 1 }],
          },
        },
        { name: 'purchase_completed', params: { plano: 'mensal', value: 37.9, currency: 'BRL', session_id: '1729260000', engagement_time_msec: 1 } },
      ],
    });
  });
  it('sem sessão, não manda session_id', () => {
    const c = corpoCompraGa4({ cliente: '1.2', sessao: null, codigo: 'x', valorCentavos: 34990, periodo: 'anual' });
    expect(c.events[0].params).not.toHaveProperty('session_id');
    expect(c.events[0].params.value).toBe(349.9);
  });
});
