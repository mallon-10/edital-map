import { describe, expect, it } from 'vitest';
import { ATALHOS, atalhoAtivo, hrefDoAtalho, OFERTA_FECHADA_DIAS, ofertaFechada, tituloDaBusca } from './inicio';
import { ASSUNTOS } from './seo/assuntos';
import type { FiltrosTela } from './tipos';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };

describe('tituloDaBusca', () => {
  it('sem termo e sem lugar: licitações abertas no Brasil', () => {
    expect(tituloDaBusca(VAZIO)).toBe('Licitações abertas no Brasil');
  });
  it('termo com a primeira letra maiúscula e o lugar', () => {
    expect(tituloDaBusca({ ...VAZIO, q: 'uniforme', uf: 'SC' })).toBe('Uniforme em Santa Catarina');
    expect(tituloDaBusca({ ...VAZIO, q: '  luva nitrílica ', uf: 'BA' })).toBe('Luva nitrílica na Bahia');
    expect(tituloDaBusca({ ...VAZIO, q: 'EPI' })).toBe('EPI no Brasil');
  });
  it('cidade vale mais que a UF; raio aparece junto', () => {
    const cidade = { ibge: '4208203', nome: 'Itajaí', uf: 'SC' };
    expect(tituloDaBusca({ ...VAZIO, q: 'epi', uf: 'SC', cidade })).toBe('Epi em Itajaí/SC');
    expect(tituloDaBusca({ ...VAZIO, cidade, raio: 50 })).toBe('Licitações abertas a 50 km de Itajaí/SC');
  });
  it('termos excluídos ficam fora do título', () => {
    expect(tituloDaBusca({ ...VAZIO, q: 'material de limpeza -escolar' })).toBe('Material de limpeza no Brasil');
  });
});

describe('atalhos de assunto', () => {
  it('seis assuntos, cada um com o termo da página /licitacoes dele', () => {
    expect(ATALHOS.map((a) => a.rotulo)).toEqual(['Uniformes', 'EPI', 'Limpeza', 'Informática', 'Alimentos', 'Hospitalar']);
    for (const a of ATALHOS) expect(ASSUNTOS.find((x) => x.slug === a.slug)?.termo).toBe(a.termo);
  });
  it('o atalho da busca atual fica marcado (plural, acento e caixa não importam)', () => {
    expect(atalhoAtivo('Uniformes')).toBe('uniformes');
    expect(atalhoAtivo('informatica')).toBe('informatica');
    expect(atalhoAtivo('uniforme escolar')).toBeNull();
    expect(atalhoAtivo('')).toBeNull();
  });
  it('o link leva o termo e mantém a UF', () => {
    expect(hrefDoAtalho(ATALHOS[0], 'SC')).toBe('/?q=uniforme&uf=SC');
    expect(hrefDoAtalho(ATALHOS[2], '')).toBe('/?q=material+de+limpeza');
  });
});

describe('oferta fechada', () => {
  const agora = new Date('2026-10-21T12:00:00Z');
  it(`some por ${OFERTA_FECHADA_DIAS} dias depois de fechar`, () => {
    expect(ofertaFechada(String(agora.getTime() - 6 * 86_400_000), agora)).toBe(true);
    expect(ofertaFechada(String(agora.getTime() - 8 * 86_400_000), agora)).toBe(false);
  });
  it('sem registro, ou registro estranho, a oferta aparece', () => {
    expect(ofertaFechada(null, agora)).toBe(false);
    expect(ofertaFechada('abc', agora)).toBe(false);
    expect(ofertaFechada(String(agora.getTime() + 86_400_000 * 30), agora)).toBe(false);
  });
});
