import { describe, expect, it } from 'vitest';
import { emLotes } from './banco';

describe('emLotes', () => {
  it('divide em lotes do tamanho pedido', () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('lista vazia não gera lote', () => {
    expect(emLotes([], 500)).toEqual([]);
  });
  it('recusa tamanho inválido', () => {
    expect(() => emLotes([1], 0)).toThrow();
  });
});
