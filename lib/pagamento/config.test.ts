import { describe, expect, it } from 'vitest';
import { configPagamento, ofertaPara, planoDaOferta } from './config';

const ENV = {
  CAKTO_WEBHOOK_SECRET: 'segredo',
  CAKTO_CLIENT_ID: 'id-publico',
  CAKTO_CLIENT_SECRET: 'segredo-da-api',
  CAKTO_OFERTA_PRO_MENSAL: 'irpv92e',
  CAKTO_OFERTA_PRO_ANUAL: 'iuy9gzb',
};

describe('configPagamento', () => {
  it('com as 5 variáveis, liga', () => {
    const cfg = configPagamento(ENV)!;
    expect(cfg).toMatchObject({ segredoWebhook: 'segredo', clienteId: 'id-publico', clienteSegredo: 'segredo-da-api' });
    expect(ofertaPara(cfg, 'anual')).toBe('iuy9gzb');
    expect(ofertaPara(cfg, 'mensal')).toBe('irpv92e');
  });
  it.each(Object.keys(ENV))('sem %s, interruptor desligado', (nome) => {
    expect(configPagamento({ ...ENV, [nome]: undefined })).toBeNull();
    expect(configPagamento({ ...ENV, [nome]: '  ' })).toBeNull();
  });
  it('as ofertas antigas do Basic não ligam nada', () => {
    expect(configPagamento({ CAKTO_OFERTA_BASIC_MENSAL: 't8o4sst', CAKTO_WEBHOOK_SECRET: 's' })).toBeNull();
  });
});

describe('planoDaOferta', () => {
  const cfg = configPagamento(ENV)!;
  it('as duas ofertas do Pro', () => {
    expect(planoDaOferta(cfg, 'irpv92e')).toEqual({ plano: 'pro', periodo: 'mensal' });
    expect(planoDaOferta(cfg, 'iuy9gzb')).toEqual({ plano: 'pro', periodo: 'anual' });
  });
  it('oferta desconhecida (inclusive as do Basic) ou vazia = null', () => {
    expect(planoDaOferta(cfg, 't8o4sst')).toBeNull();
    expect(planoDaOferta(cfg, null)).toBeNull();
  });
});
