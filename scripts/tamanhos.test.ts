import { describe, expect, it } from 'vitest';
import { formatarTamanhos, mb } from './tamanhos';

const MB = 1024 * 1024;

describe('mb', () => {
  it('megabytes com vírgula e uma casa', () => {
    expect(mb(321 * MB)).toBe('321,0 MB');
    expect(mb(1.5 * MB)).toBe('1,5 MB');
  });
});

describe('formatarTamanhos', () => {
  it('banco primeiro, com aviso acima da meta, e tabelas da maior para a menor', () => {
    expect(
      formatarTamanhos([
        { nome: 'contratacoes', bytes: 134 * MB },
        { nome: 'banco', bytes: 321 * MB },
        { nome: 'itens', bytes: 175 * MB },
      ]),
    ).toBe('Banco: 321,0 MB (acima da meta de 300 MB)\n  itens: 175,0 MB\n  contratacoes: 134,0 MB');
  });
  it('abaixo da meta não avisa', () => {
    expect(formatarTamanhos([{ nome: 'banco', bytes: 250 * MB }])).toBe('Banco: 250,0 MB');
  });
});
