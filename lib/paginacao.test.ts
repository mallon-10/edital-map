import { describe, expect, it } from 'vitest';
import { itensPaginacao, totalPaginas } from './paginacao';

describe('totalPaginas', () => {
  it('20 por página, pelo menos 1, no máximo 1000', () => {
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(20)).toBe(1);
    expect(totalPaginas(21)).toBe(2);
    expect(totalPaginas(1_000_000)).toBe(1000);
  });
});

describe('itensPaginacao', () => {
  it('até 7 páginas: todas', () => {
    expect(itensPaginacao(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('no começo, no meio e no fim', () => {
    expect(itensPaginacao(1, 10)).toEqual([1, 2, 3, 4, 'reticencias', 10]);
    expect(itensPaginacao(3, 10)).toEqual([1, 2, 3, 4, 'reticencias', 10]);
    expect(itensPaginacao(5, 10)).toEqual([1, 'reticencias', 4, 5, 6, 'reticencias', 10]);
    expect(itensPaginacao(10, 10)).toEqual([1, 'reticencias', 7, 8, 9, 10]);
  });
  it('página fora do intervalo fica no limite', () => {
    expect(itensPaginacao(99, 10)).toEqual(itensPaginacao(10, 10));
  });
});
