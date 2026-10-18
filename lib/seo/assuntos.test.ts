import { describe, expect, it } from 'vitest';
import { chave, GRUPOS } from '../relevancia/termos';
import { UFS_BRASIL } from '../eventos';
import { ASSUNTOS, assuntoPorSlug, naUf, resolverSegmento, ufPorSlug, url } from './assuntos';

describe('ASSUNTOS', () => {
  it('cobre cada grupo de termos uma vez', () => {
    expect(ASSUNTOS.map((a) => a.grupo).sort()).toEqual(GRUPOS.map((g) => g.assunto).sort());
  });
  it('o termo da busca é um termo do próprio grupo', () => {
    for (const a of ASSUNTOS) {
      const g = GRUPOS.find((x) => x.assunto === a.grupo)!;
      expect(g.termos.map(chave)).toContain(chave(a.termo));
    }
  });
  it('slugs únicos, minúsculos, sem acento e nunca com 2 letras (2 letras = UF)', () => {
    const slugs = ASSUNTOS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(s.length).toBeGreaterThan(2);
    }
  });
});

describe('resolverSegmento', () => {
  it('assunto, UF e desconhecido', () => {
    expect(resolverSegmento('epi')).toEqual({ tipo: 'assunto', assunto: assuntoPorSlug('epi') });
    expect(resolverSegmento('sp')).toEqual({ tipo: 'uf', uf: 'SP' });
    expect(resolverSegmento('SP')).toBeNull();
    expect(resolverSegmento('xx')).toBeNull();
    expect(resolverSegmento('qualquer')).toBeNull();
  });
  it('ufPorSlug aceita as 27 UFs em minúsculas', () => {
    for (const uf of UFS_BRASIL) expect(ufPorSlug(uf.toLowerCase())).toBe(uf);
  });
});

describe('naUf', () => {
  it('preposição certa', () => {
    expect(naUf('SP')).toBe('em São Paulo');
    expect(naUf('BA')).toBe('na Bahia');
    expect(naUf('PB')).toBe('na Paraíba');
    expect(naUf('RJ')).toBe('no Rio de Janeiro');
    expect(naUf('DF')).toBe('no Distrito Federal');
    expect(naUf('GO')).toBe('em Goiás');
  });
  it('todas as UFs têm preposição', () => {
    for (const uf of UFS_BRASIL) expect(naUf(uf)).toMatch(/^(em|na|no) /);
  });
});

it('url absoluta', () => {
  expect(url('/licitacoes/epi')).toBe('https://www.editalmap.com.br/licitacoes/epi');
  expect(url('/')).toBe('https://www.editalmap.com.br/');
});
