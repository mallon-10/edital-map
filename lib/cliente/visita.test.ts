import { describe, expect, it } from 'vitest';
import { pistasDaEntrada } from './visita';

describe('pistasDaEntrada', () => {
  it('sem quem mandou: entrada direta, sem domínio', () => {
    expect(pistasDaEntrada('', 'https://www.editalmap.com.br/')).toEqual({
      entrada: true, site: null, utm_source: null, utm_medium: null, utm_campaign: null, anuncio: false,
    });
  });
  it('de outro site: só o domínio, nunca o caminho', () => {
    expect(pistasDaEntrada('https://www.google.com/search?q=luva', 'https://www.editalmap.com.br/licitacoes/epi')).toMatchObject({
      entrada: true, site: 'www.google.com',
    });
  });
  it('lê utm_* e o clique de anúncio do endereço', () => {
    expect(pistasDaEntrada('', 'https://www.editalmap.com.br/?q=epi&utm_source=google&utm_medium=cpc&utm_campaign=epi&gclid=abc')).toEqual({
      entrada: true, site: null, utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'epi', anuncio: true,
    });
    expect(pistasDaEntrada('', 'https://www.editalmap.com.br/?gbraid=x')?.anuncio).toBe(true);
  });
  it('vindo do próprio site (recarregar, abrir em nova aba) não é entrada', () => {
    expect(pistasDaEntrada('https://www.editalmap.com.br/planos', 'https://www.editalmap.com.br/')).toBeNull();
    expect(pistasDaEntrada('https://editalmap.com.br/', 'https://www.editalmap.com.br/')).toBeNull();
  });
  it('referência quebrada conta como direta', () => {
    expect(pistasDaEntrada('não é url', 'https://www.editalmap.com.br/')).toMatchObject({ entrada: true, site: null });
  });
});
