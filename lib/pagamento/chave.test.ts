import { describe, expect, it } from 'vitest';
import { ALFABETO_CHAVE, gerarChave, normalizarChave } from './chave';

describe('gerarChave', () => {
  it('formato EM-XXXX-XXXX-XXXX no alfabeto sem 0/O/1/I/L', () => {
    for (let i = 0; i < 50; i++) {
      const c = gerarChave();
      expect(c).toMatch(/^EM-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      for (const ch of c.slice(3).replace(/-/g, '')) expect(ALFABETO_CHAVE).toContain(ch);
    }
  });
  it('determinística com bytes fixos', () => {
    const bytes = (n: number) => Buffer.alloc(n, 0);
    expect(gerarChave(bytes)).toBe('EM-AAAA-AAAA-AAAA');
  });
  it('alfabeto sem caracteres ambíguos', () => {
    for (const ch of '0O1IL') expect(ALFABETO_CHAVE).not.toContain(ch);
  });
});

describe('normalizarChave', () => {
  it('aceita minúsculas, espaços e sem hífens', () => {
    expect(normalizarChave(' em-abcd efgh-jkmn ')).toBe('EM-ABCD-EFGH-JKMN');
    expect(normalizarChave('EMABCDEFGHJKMN')).toBe('EM-ABCD-EFGH-JKMN');
    expect(normalizarChave('abcd-efgh-jkmn')).toBe('EM-ABCD-EFGH-JKMN');
  });
  it('chave que começa com EM, digitada sem o prefixo', () => {
    expect(normalizarChave('emab-cdef-ghjk')).toBe('EM-EMAB-CDEF-GHJK');
    expect(normalizarChave('EM-EMAB-CDEF-GHJK')).toBe('EM-EMAB-CDEF-GHJK');
  });
  it('recusa caractere fora do alfabeto ou tamanho errado', () => {
    expect(normalizarChave('EM-ABC0-EFGH-JKMN')).toBeNull();
    expect(normalizarChave('EM-ABCD-EFGH')).toBeNull();
    expect(normalizarChave('')).toBeNull();
  });
});
