import { describe, expect, it } from 'vitest';
import { configPagamento, linkCheckout, ofertaPara, planoDaOferta } from './config';

const ENV = {
  CAKTO_WEBHOOK_SECRET: 'segredo',
  CAKTO_OFERTA_BASIC_MENSAL: 't8o4sst',
  CAKTO_OFERTA_BASIC_ANUAL: 'm2nvms3',
  CAKTO_OFERTA_PRO_MENSAL: 'irpv92e',
  CAKTO_OFERTA_PRO_ANUAL: 'iuy9gzb',
};

describe('configPagamento', () => {
  it('com as 5 variáveis, liga', () => {
    const cfg = configPagamento(ENV)!;
    expect(cfg.segredoWebhook).toBe('segredo');
    expect(ofertaPara(cfg, 'pro', 'anual')).toBe('iuy9gzb');
    expect(ofertaPara(cfg, 'basic', 'mensal')).toBe('t8o4sst');
  });
  it.each(Object.keys(ENV))('sem %s, interruptor desligado', (nome) => {
    expect(configPagamento({ ...ENV, [nome]: undefined })).toBeNull();
    expect(configPagamento({ ...ENV, [nome]: '  ' })).toBeNull();
  });
});

describe('planoDaOferta', () => {
  const cfg = configPagamento(ENV)!;
  it('acha as quatro ofertas', () => {
    expect(planoDaOferta(cfg, 't8o4sst')).toEqual({ plano: 'basic', periodo: 'mensal' });
    expect(planoDaOferta(cfg, 'm2nvms3')).toEqual({ plano: 'basic', periodo: 'anual' });
    expect(planoDaOferta(cfg, 'irpv92e')).toEqual({ plano: 'pro', periodo: 'mensal' });
    expect(planoDaOferta(cfg, 'iuy9gzb')).toEqual({ plano: 'pro', periodo: 'anual' });
  });
  it('oferta desconhecida ou vazia = null', () => {
    expect(planoDaOferta(cfg, 'outra')).toBeNull();
    expect(planoDaOferta(cfg, null)).toBeNull();
  });
});

describe('linkCheckout', () => {
  it('com e sem código', () => {
    expect(linkCheckout('t8o4sst', 'ab12')).toBe('https://pay.cakto.com.br/t8o4sst?callback=ab12');
    expect(linkCheckout('t8o4sst', null)).toBe('https://pay.cakto.com.br/t8o4sst');
  });
  it('código fora do alfabeto aceito pela Cakto lança erro', () => {
    expect(() => linkCheckout('t8o4sst', 'a b')).toThrow();
    expect(() => linkCheckout('t8o4sst', 'a@b')).toThrow();
  });
});
