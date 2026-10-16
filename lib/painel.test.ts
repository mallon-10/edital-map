import { describe, expect, it } from 'vitest';
import { COR_SEM_COBERTURA, CORES_FAIXA, coresDosEstados, faixaDaUf, resumirPontos } from './painel';
import type { PontoMapa } from './tipos';

const P = (codigo_ibge: string, nome: string, uf: string, qtd: number, valor_total: number | null): PontoMapa => ({
  codigo_ibge, nome, uf, lat: 0, lng: 0, qtd, valor_total, prazo_mais_proximo: '2026-10-20T13:00:00Z',
});

describe('resumirPontos', () => {
  it('soma por UF, total, valor e os municípios com mais editais', () => {
    const r = resumirPontos(
      [P('4106902', 'Curitiba', 'PR', 312, 1e8), P('4205407', 'Florianópolis', 'SC', 120, 5e7), P('4314902', 'Porto Alegre', 'RS', 152, null), P('4113700', 'Londrina', 'PR', 40, 2e6)],
      3,
    );
    expect(r.porUf).toEqual({ PR: 352, SC: 120, RS: 152 });
    expect(r.ufs).toBe(3);
    expect(r.total).toBe(624);
    expect(r.valorTotal).toBe(152_000_000);
    expect(r.topMunicipios).toEqual([
      { nome: 'Curitiba', uf: 'PR', ibge: '4106902', qtd: 312 },
      { nome: 'Porto Alegre', uf: 'RS', ibge: '4314902', qtd: 152 },
      { nome: 'Florianópolis', uf: 'SC', ibge: '4205407', qtd: 120 },
    ]);
  });
  it('sem pontos', () => {
    expect(resumirPontos([])).toEqual({ porUf: {}, topMunicipios: [], valorTotal: 0, ufs: 0, total: 0 });
  });
});

describe('cores dos estados', () => {
  it('faixas 1–19, 20–49, 50–199, 200+', () => {
    expect([0, 1, 19, 20, 49, 50, 199, 200].map(faixaDaUf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it('expressão de cor: estados cobertos pela faixa, os outros em cinza', () => {
    expect(coresDosEstados({ PR: 352, SC: 5 }, ['SC', 'PR', 'RS'])).toEqual([
      'match', ['get', 'uf'], 'SC', CORES_FAIXA[1], 'PR', CORES_FAIXA[4], 'RS', CORES_FAIXA[0], COR_SEM_COBERTURA,
    ]);
  });
});
