import { describe, expect, it } from 'vitest';
import type { FiltrosTela } from '../tipos';
import { guardarUltimaBusca, guardarVolta, lerUltimaBusca, tomarVolta, type Volta } from './volta';

function armazem() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const quebrado = {
  getItem: (): string | null => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
  removeItem: () => {
    throw new Error('bloqueado');
  },
};
const F: FiltrosTela = { q: 'luva', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const V: Volta = {
  endereco: '/?q=luva&tela=lista', filtros: F, filtrosMapa: F, resultado: { total: 0, editais: [] }, limite: null, tela: 'lista', selecionadoId: null, rolagem: 420,
};

describe('volta do edital', () => {
  it('devolve o estado guardado do mesmo endereço, uma vez só', () => {
    const a = armazem();
    guardarVolta(V, a);
    expect(tomarVolta('/?q=luva&tela=lista', a)).toEqual(V);
    expect(tomarVolta('/?q=luva&tela=lista', a)).toBeNull();
  });
  it('endereço diferente: não restaura (e descarta)', () => {
    const a = armazem();
    guardarVolta(V, a);
    expect(tomarVolta('/?q=botina', a)).toBeNull();
    expect(tomarVolta('/?q=luva&tela=lista', a)).toBeNull();
  });
  it('sem armazenamento, bloqueado ou com lixo: nada quebra', () => {
    expect(tomarVolta('/', null)).toBeNull();
    expect(() => guardarVolta(V, null)).not.toThrow();
    expect(() => guardarVolta(V, quebrado)).not.toThrow();
    expect(tomarVolta('/', quebrado)).toBeNull();
    const a = armazem();
    a.setItem('em_volta', '{lixo');
    expect(tomarVolta('/', a)).toBeNull();
  });
  it('sem argumento (fora do navegador) usa nada e não quebra', () => {
    expect(tomarVolta('/')).toBeNull();
    expect(lerUltimaBusca()).toBe('/');
  });
});

describe('última busca (links da barra do celular)', () => {
  it('guarda e lê; padrão "/"; só aceita endereço da página inicial', () => {
    const a = armazem();
    expect(lerUltimaBusca(a)).toBe('/');
    guardarUltimaBusca('/?q=luva', a);
    expect(lerUltimaBusca(a)).toBe('/?q=luva');
    a.setItem('em_ultima_busca', 'https://outro.site');
    expect(lerUltimaBusca(a)).toBe('/');
    expect(lerUltimaBusca(null)).toBe('/');
    expect(lerUltimaBusca(quebrado)).toBe('/');
  });
});
