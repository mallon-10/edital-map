import { describe, expect, it } from 'vitest';
import { posicaoNoMeio, textoDoResultado, ATALHOS, atalhoAtivo, hrefDoAtalho, juntarEditais, OFERTA_FECHADA_DIAS, ofertaFechada, proximaPagina, temMais, tituloDaBusca } from './inicio';
import { ASSUNTOS } from './seo/assuntos';
import type { FiltrosTela } from './tipos';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };

describe('textoDoResultado', () => {
  const B = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
  it('quantos, o quê e onde', () => {
    expect(textoDoResultado({ ...B, q: 'uniformes escolares' }, 286)).toBe('286 editais encontrados para uniformes escolares');
    expect(textoDoResultado({ ...B, q: 'luva', uf: 'SC' }, 9)).toBe('9 editais encontrados para luva em Santa Catarina');
    expect(textoDoResultado({ ...B, q: 'luva' }, 1)).toBe('1 edital encontrado para luva');
    expect(textoDoResultado({ ...B, q: 'luva' }, 12345)).toBe('12.345 editais encontrados para luva');
  });
  it('só o lugar', () => {
    expect(textoDoResultado({ ...B, uf: 'SC' }, 120)).toBe('120 editais encontrados em Santa Catarina');
  });
  it('nenhum resultado também é resposta', () => {
    expect(textoDoResultado({ ...B, q: 'xyz' }, 0)).toBe('Nenhum edital aberto para xyz');
  });
  it('sem busca, nada a confirmar', () => {
    expect(textoDoResultado(B, 900)).toBeNull();
  });
});

describe('posicaoNoMeio', () => {
  it('depois do 5º edital; lista curta, depois do último', () => {
    expect(posicaoNoMeio(20)).toBe(4);
    expect(posicaoNoMeio(5)).toBe(4);
    expect(posicaoNoMeio(3)).toBe(2);
    expect(posicaoNoMeio(1)).toBe(0);
  });
});

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

describe('lista que carrega ao rolar', () => {
  const ed = (id: string) => ({ id }) as unknown as import('./tipos').EditalResumo;
  it('a próxima página segue as que já estão na tela (20 por página), a partir da primeira do endereço', () => {
    expect(proximaPagina(1, 20)).toBe(2);
    expect(proximaPagina(1, 40)).toBe(3);
    expect(proximaPagina(3, 20)).toBe(4);
    expect(proximaPagina(1, 0)).toBe(1);
  });
  it('junta sem repetir (um edital novo pode empurrar outro para a página seguinte)', () => {
    expect(juntarEditais([ed('a'), ed('b')], [ed('b'), ed('c')]).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
  it('tem mais enquanto a tela mostra menos que o total', () => {
    expect(temMais({ total: 41, editais: Array.from({ length: 40 }, (_, i) => ed(String(i))) })).toBe(true);
    expect(temMais({ total: 40, editais: Array.from({ length: 40 }, (_, i) => ed(String(i))) })).toBe(false);
  });
});
