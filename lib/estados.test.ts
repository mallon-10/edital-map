import { describe, expect, it } from 'vitest';
import { centroDoEstado, NOMES_UF } from './estados';
import { UFS_BRASIL } from './eventos';

describe('NOMES_UF', () => {
  it('tem as 27 UFs, e só elas', () => {
    expect(Object.keys(NOMES_UF).sort()).toEqual([...UFS_BRASIL].sort());
  });
  it('nomes em português, com acento', () => {
    expect(NOMES_UF.SP).toBe('São Paulo');
    expect(NOMES_UF.PA).toBe('Pará');
    expect(NOMES_UF.DF).toBe('Distrito Federal');
  });
});

describe('centroDoEstado', () => {
  it('centro por área de um polígono', () => {
    const quadrado = { type: 'Polygon' as const, coordinates: [[[0, 0], [4, 0], [4, 2], [0, 2], [0, 0]]] };
    expect(centroDoEstado(quadrado)).toEqual([2, 1]);
  });
  it('anel no sentido horário dá o mesmo centro', () => {
    const horario = { type: 'Polygon' as const, coordinates: [[[0, 0], [0, 2], [4, 2], [4, 0], [0, 0]]] };
    expect(centroDoEstado(horario)).toEqual([2, 1]);
  });
  it('multipolígono: usa o maior pedaço (ilhas não puxam o nome)', () => {
    const g = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
        [[[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]]],
      ],
    };
    expect(centroDoEstado(g)).toEqual([3, 3]);
  });
});
