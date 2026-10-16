import { describe, expect, it } from 'vitest';
import { sortearAmostra, ufsDaConferencia, type Candidata } from './amostra';

function candidata(n: number, extra: Partial<Candidata> = {}): Candidata {
  return {
    id: `C${n}`,
    cnpj: '1',
    ano: 2026,
    sequencial: n,
    uf: 'SC',
    modalidade_id: 6,
    valor_estimado: 1000,
    link_origem: 'https://x',
    muitos_itens: false,
    ...extra,
  };
}

describe('sortearAmostra', () => {
  const candidatas = [
    ...Array.from({ length: 40 }, (_, i) => candidata(i)),
    candidata(100, { muitos_itens: true }),
    candidata(101, { valor_estimado: 0 }),
    candidata(102, { link_origem: null }),
    candidata(103, { uf: 'PR' }),
    candidata(104, { uf: 'RS', modalidade_id: 8 }),
  ];

  it('inclui os casos difíceis, todas as UFs e todas as modalidades', () => {
    const amostra = sortearAmostra(candidatas, 20, () => 0);
    const ids = amostra.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['C100', 'C101', 'C102']));
    expect(new Set(amostra.map((a) => a.uf))).toEqual(new Set(['SC', 'PR', 'RS']));
    expect(new Set(amostra.map((a) => a.modalidade_id))).toEqual(new Set([6, 8]));
  });
  it('respeita o tamanho e não repete', () => {
    const amostra = sortearAmostra(candidatas, 20);
    expect(amostra).toHaveLength(20);
    expect(new Set(amostra.map((a) => a.id)).size).toBe(20);
  });
  it('com poucas candidatas, devolve todas', () => {
    expect(sortearAmostra([candidata(1), candidata(2)], 20)).toHaveLength(2);
  });
});

describe('ufsDaConferencia', () => {
  it('sem valor, sorteia 3 UFs diferentes do Brasil, em ordem', () => {
    expect(ufsDaConferencia(undefined, () => 0)).toEqual(['AC', 'AL', 'AM']);
  });
  it('usa as UFs pedidas', () => {
    expect(ufsDaConferencia(' sp,ba ')).toEqual(['SP', 'BA']);
  });
  it('recusa BR e UF inexistente', () => {
    expect(() => ufsDaConferencia('BR')).toThrow('informe UFs');
    expect(() => ufsDaConferencia('XX')).toThrow('UF inválida: XX');
  });
});
