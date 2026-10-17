import { describe, expect, it } from 'vitest';
import { CONTORNO_VAZIO_COR, CORES_FAIXA, contornosDosEstados, coresDosEstados, faixasRelativas, resumirPontos } from './painel';
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

describe('faixas relativas', () => {
  it('quatro grupos de tamanho parecido, do menor ao maior número de editais', () => {
    const porUf = { AP: 52, RR: 79, AC: 128, AM: 237, SE: 248, PI: 407, PE: 926, CE: 1129, BA: 2817, PR: 3368, MG: 5407, SP: 5946 };
    const f = faixasRelativas(porUf);
    expect(['AP', 'RR', 'AC'].map((uf) => f.faixaDe(porUf[uf as keyof typeof porUf]))).toEqual([1, 1, 1]);
    expect(['AM', 'SE', 'PI'].map((uf) => f.faixaDe(porUf[uf as keyof typeof porUf]))).toEqual([2, 2, 2]);
    expect(['PE', 'CE', 'BA'].map((uf) => f.faixaDe(porUf[uf as keyof typeof porUf]))).toEqual([3, 3, 3]);
    expect(['PR', 'MG', 'SP'].map((uf) => f.faixaDe(porUf[uf as keyof typeof porUf]))).toEqual([4, 4, 4]);
    expect(f.limites).toEqual([
      { faixa: 1, de: 52, ate: 128 },
      { faixa: 2, de: 237, ate: 407 },
      { faixa: 3, de: 926, ate: 2817 },
      { faixa: 4, de: 3368, ate: 5946 },
    ]);
  });
  it('valores iguais ficam na mesma faixa', () => {
    const f = faixasRelativas({ SC: 10, PR: 10, RS: 10, BA: 10, SP: 40 });
    expect(f.faixaDe(10)).toBe(f.faixaDe(10));
    expect(f.faixaDe(40)).toBe(4);
    expect(f.faixaDe(10)).toBeLessThan(4);
  });
  it('poucos estados: o maior fica no tom mais escuro', () => {
    expect(faixasRelativas({ SP: 3 }).faixaDe(3)).toBe(4);
    const f = faixasRelativas({ SP: 8, AM: 1 });
    expect([f.faixaDe(1), f.faixaDe(8)]).toEqual([3, 4]);
    expect(f.limites).toEqual([
      { faixa: 3, de: 1, ate: 1 },
      { faixa: 4, de: 8, ate: 8 },
    ]);
  });
  it('sem editais: faixa 0 e nenhum limite', () => {
    const f = faixasRelativas({ SC: 0 });
    expect(f.faixaDe(0)).toBe(0);
    expect(f.limites).toEqual([]);
  });
});

describe('cores dos estados', () => {
  it('expressão de cor: cada estado com editais pela faixa relativa, os outros no tom mais claro', () => {
    expect(coresDosEstados({ SC: 5, PR: 352, RS: 0, BA: 60, SP: 400 })).toEqual([
      'match', ['get', 'uf'], 'BA', CORES_FAIXA[2], 'PR', CORES_FAIXA[3], 'SC', CORES_FAIXA[1], 'SP', CORES_FAIXA[4], CORES_FAIXA[0],
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
