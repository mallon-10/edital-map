import { describe, expect, it } from 'vitest';
import { CONTORNO_VAZIO_COR, CORES_FAIXA, contornosDosEstados, coresDosEstados, faixaDaUf, resumirPontos } from './painel';
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
  it('empate: qtd, depois nome, UF e código IBGE, independente da ordem de entrada', () => {
    const empate = [
      P('4216602', 'Bom Jesus', 'SC', 10, 1e6),
      P('2907301', 'Bom Jesus', 'RS', 10, 1e6),
      P('4113205', 'Bom Jesus', 'PR', 10, 1e6),
    ];
    const ordem = ['PR', 'RS', 'SC'];
    expect(resumirPontos(empate).topMunicipios.map((m) => m.uf)).toEqual(ordem);
    expect(resumirPontos([...empate].reverse()).topMunicipios.map((m) => m.uf)).toEqual(ordem);
  });
  it('sem pontos', () => {
    expect(resumirPontos([])).toEqual({ porUf: {}, topMunicipios: [], valorTotal: 0, ufs: 0, total: 0 });
  });
});

describe('cores dos estados', () => {
  it('faixas 1–19, 20–49, 50–199, 200+', () => {
    expect([0, 1, 19, 20, 49, 50, 199, 200].map(faixaDaUf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it('expressão de cor: cada estado com editais pela faixa, os outros no tom mais claro', () => {
    expect(coresDosEstados({ SC: 5, PR: 352, RS: 0, BA: 60 })).toEqual([
      'match', ['get', 'uf'], 'BA', CORES_FAIXA[3], 'PR', CORES_FAIXA[4], 'SC', CORES_FAIXA[1], CORES_FAIXA[0],
    ]);
  });
  it('nenhum estado com editais: cor única (o match do MapLibre exige ao menos um rótulo)', () => {
    expect(coresDosEstados({})).toBe(CORES_FAIXA[0]);
  });
});

describe('contornos dos estados', () => {
  const UFS = ['SC', 'PR', 'RS', 'SP'];
  it('nenhum estado vazio: contorno branco comum', () => {
    expect(contornosDosEstados({ SC: 5, PR: 352, RS: 1, SP: 9 }, UFS)).toEqual({ cor: '#ffffff', largura: 1 });
  });
  it('qualquer UF sem resultado ganha o contorno azul mais grosso', () => {
    expect(contornosDosEstados({ PR: 352, RS: 1, SC: 4 }, UFS)).toEqual({
      cor: ['match', ['get', 'uf'], ['SP'], CONTORNO_VAZIO_COR, '#ffffff'],
      largura: ['match', ['get', 'uf'], ['SP'], 1.5, 1],
    });
  });
  it('vários vazios: uma lista só de rótulos, na ordem da lista de UFs', () => {
    expect(contornosDosEstados({ PR: 352 }, UFS)).toEqual({
      cor: ['match', ['get', 'uf'], ['SC', 'RS', 'SP'], '#9db0cc', '#ffffff'],
      largura: ['match', ['get', 'uf'], ['SC', 'RS', 'SP'], 1.5, 1],
    });
  });
});
