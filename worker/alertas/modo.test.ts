import { describe, expect, it } from 'vitest';
import { lerModo } from './modo';

describe('modo do job', () => {
  it('alertas por padrão; --modo resumo; outro valor é erro', () => {
    expect(lerModo([])).toBe('alertas');
    expect(lerModo(['--modo', 'alertas'])).toBe('alertas');
    expect(lerModo(['--modo', 'resumo'])).toBe('resumo');
    expect(() => lerModo(['--modo', 'tudo'])).toThrow('Modo inválido: tudo (use alertas ou resumo)');
  });
  it('--modo=resumo também vale (não cai em alertas sem avisar)', () => {
    expect(lerModo(['--modo=resumo'])).toBe('resumo');
    expect(lerModo(['--modo=alertas'])).toBe('alertas');
    expect(() => lerModo(['--modo=tudo'])).toThrow('Modo inválido: tudo (use alertas ou resumo)');
  });
  it('--modo sem valor é erro (não vira alertas em silêncio)', () => {
    const msg = '--modo sem valor (use alertas ou resumo)';
    expect(() => lerModo(['--modo'])).toThrow(msg);
    expect(() => lerModo(['--modo', '--outra'])).toThrow(msg);
    expect(() => lerModo(['--modo', '--modo=resumo'])).toThrow(msg);
    expect(() => lerModo(['--modo='])).toThrow(msg);
    expect(() => lerModo(['--modo', '  '])).toThrow(msg);
  });
});
