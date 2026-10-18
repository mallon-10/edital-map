import { describe, expect, it } from 'vitest';
import { URL_MAPA_BRASIL, urlDosPontos } from './pontosMapa';

describe('urlDosPontos', () => {
  it('sem nenhum filtro: o mapa do Brasil, servido pela CDN', () => {
    expect(urlDosPontos(new URLSearchParams())).toBe(URL_MAPA_BRASIL);
    expect(URL_MAPA_BRASIL).toBe('/dados/mapa-brasil');
  });
  it('com qualquer filtro: a rota que conta a busca', () => {
    expect(urlDosPontos(new URLSearchParams('q=luva'))).toBe('/api/mapa?q=luva');
    expect(urlDosPontos(new URLSearchParams('dias=7'))).toBe('/api/mapa?dias=7');
  });
});
