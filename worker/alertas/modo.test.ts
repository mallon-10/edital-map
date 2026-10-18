import { describe, expect, it } from 'vitest';
import { lerModo } from './modo';

describe('modo do job', () => {
  it('alertas por padrão; --modo resumo; outro valor é erro', () => {
    expect(lerModo([])).toBe('alertas');
    expect(lerModo(['--modo', 'alertas'])).toBe('alertas');
    expect(lerModo(['--modo', 'resumo'])).toBe('resumo');
    expect(lerModo(['--modo='])).toBe('alertas');
    expect(() => lerModo(['--modo', 'tudo'])).toThrow('Modo inválido: tudo (use alertas ou resumo)');
  });
  it('--modo=resumo também vale (não cai em alertas sem avisar)', () => {
    expect(lerModo(['--modo=resumo'])).toBe('resumo');
    expect(lerModo(['--modo=alertas'])).toBe('alertas');
    expect(lerModo(['--modo'])).toBe('alertas');
    expect(() => lerModo(['--modo=tudo'])).toThrow('Modo inválido: tudo (use alertas ou resumo)');
  });
});
