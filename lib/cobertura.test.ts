import { describe, expect, it } from 'vitest';
import { FONTE_COBERTURA } from './cobertura';
import { MODALIDADES } from './filtros';

describe('cobertura honesta', () => {
  it('texto da spec', () => {
    expect(FONTE_COBERTURA).toBe('Fonte: PNCP · Pregão, Concorrência, Dispensa e Credenciamento');
  });
  it('as modalidades buscadas (6, 7, 4, 8, 12) aparecem no texto', () => {
    expect(MODALIDADES.map((m) => m.id).sort((a, b) => a - b)).toEqual([4, 6, 7, 8, 12]);
    for (const m of MODALIDADES) expect(FONTE_COBERTURA).toContain(m.nome.split(' ')[0]);
  });
});
