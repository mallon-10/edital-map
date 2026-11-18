import { describe, expect, it } from 'vitest';
import { aulasNumeradas, campanhaDoEndereco, ehPaginaVsl, MODULOS_CURSO, linkDoCheckout, marcosNovos, momentoDaOferta, precoDoCurso, variacaoDoTitulo } from './cursoLicitacao';

describe('curso de licitação (VSL)', () => {
  it('variação do título aceita só A, B e C', () => {
    expect(variacaoDoTitulo('b')).toBe('B');
    expect(variacaoDoTitulo('x')).toBe('A');
    expect(variacaoDoTitulo(null)).toBe('A');
  });

  it('reconhece só a rota do curso', () => {
    expect(ehPaginaVsl('/cursolicitacao')).toBe(true);
    expect(ehPaginaVsl('/cursolicitacao/x')).toBe(true);
    expect(ehPaginaVsl('/cursolicitacaox')).toBe(false);
    expect(ehPaginaVsl('/')).toBe(false);
  });

  it('guarda só os parâmetros de campanha', () => {
    const p = new URLSearchParams('utm_source=meta&utm_campaign=vsl&email=a@b.com&gclid=123&src=');
    expect(campanhaDoEndereco(p)).toEqual({ utm_source: 'meta', utm_campaign: 'vsl', gclid: '123' });
  });

  it('leva a campanha ao checkout sem sobrescrever o link', () => {
    expect(linkDoCheckout('https://pay.cakto.com.br/abc?src=anuncio', { src: 'outro', utm_source: 'meta' })).toBe(
      'https://pay.cakto.com.br/abc?src=anuncio&utm_source=meta',
    );
    expect(linkDoCheckout('', { utm_source: 'meta' })).toBe('');
    expect(linkDoCheckout('javascript:alert(1)', {})).toBe('');
    expect(linkDoCheckout('não é link', {})).toBe('');
  });

  it('a oferta sobe faltando os segundos combinados', () => {
    expect(momentoDaOferta(240, 10)).toBe(230);
    expect(momentoDaOferta(5, 10)).toBe(0);
    expect(momentoDaOferta(NaN, 10)).toBeNull();
    expect(momentoDaOferta(0, 10)).toBeNull();
  });

  it('conta cada marco de progresso uma vez', () => {
    expect(marcosNovos(130, 200, new Set())).toEqual([25, 50]);
    expect(marcosNovos(130, 200, new Set([25]))).toEqual([50]);
    expect(marcosNovos(10, 0, new Set())).toEqual([]);
  });

  it('preço em reais ou nada', () => {
    expect(precoDoCurso(4790)).toBe('R$ 47,90');
    expect(precoDoCurso(null)).toBeNull();
  });

  it('conteúdo: 6 módulos e 16 aulas, numeradas em sequência como na área de membros', () => {
    expect(MODULOS_CURSO).toHaveLength(6);
    const n = aulasNumeradas();
    expect(n.map((m) => m.inicio)).toEqual([1, 4, 7, 10, 12, 15]);
    expect(n.reduce((t, m) => t + m.aulas.length, 0)).toBe(16);
  });
});
