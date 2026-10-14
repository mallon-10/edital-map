import { describe, expect, it } from 'vitest';
import { deBrasilia, hojeBrasilia, inicioDoDia, paraPncp, somarDias } from './datas';

describe('deBrasilia', () => {
  it('lê a data sem fuso como horário de Brasília', () => {
    expect(deBrasilia('2026-09-22T08:00:00')).toBe('2026-09-22T11:00:00.000Z');
  });
  it('muda o dia em UTC quando passa das 21h', () => {
    expect(deBrasilia('2026-10-26T22:30:00')).toBe('2026-10-27T01:30:00.000Z');
  });
  it('devolve null para vazio', () => {
    expect(deBrasilia(null)).toBeNull();
    expect(deBrasilia(undefined)).toBeNull();
    expect(deBrasilia('  ')).toBeNull();
  });
  it('recusa data inválida', () => {
    expect(() => deBrasilia('abc')).toThrow();
  });
});

describe('dias', () => {
  it('hoje é o dia de Brasília, não o de UTC', () => {
    expect(hojeBrasilia(new Date('2026-10-15T02:00:00Z'))).toBe('2026-10-14');
  });
  it('soma e subtrai dias atravessando mês e ano', () => {
    expect(somarDias('2026-10-01', -1)).toBe('2026-09-30');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('formata para o parâmetro do PNCP', () => {
    expect(paraPncp('2026-10-13')).toBe('20261013');
  });
  it('dá a meia-noite de Brasília em UTC', () => {
    expect(inicioDoDia('2026-10-13')).toBe('2026-10-13T03:00:00.000Z');
  });
});
