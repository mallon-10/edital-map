import { describe, expect, it } from 'vitest';
import { lerModalidades, lerPorMinuto, lerSupabase, lerUfs } from './config';

describe('lerUfs', () => {
  it('usa SC, PR e RS quando não há valor', () => {
    expect(lerUfs(undefined)).toEqual(['SC', 'PR', 'RS']);
    expect(lerUfs('  ')).toEqual(['SC', 'PR', 'RS']);
  });
  it('normaliza espaços, caixa e repetições', () => {
    expect(lerUfs(' sc, pr ,SC')).toEqual(['SC', 'PR']);
  });
  it('recusa UF que não existe', () => {
    expect(() => lerUfs('SC,XX')).toThrow('UF inválida: XX');
  });
});

describe('lerModalidades', () => {
  it('usa as 5 modalidades da v1 quando não há valor', () => {
    expect(lerModalidades(undefined)).toEqual([6, 8, 4, 7, 12]);
  });
  it('aceita um subconjunto', () => {
    expect(lerModalidades('6,8')).toEqual([6, 8]);
  });
  it('recusa modalidade fora da v1', () => {
    expect(() => lerModalidades('6,9')).toThrow('Modalidade fora da v1: 9');
  });
});

describe('lerPorMinuto', () => {
  it('usa 20 quando não há valor', () => {
    expect(lerPorMinuto(undefined)).toBe(20);
  });
  it('aceita um número inteiro', () => {
    expect(lerPorMinuto('12')).toBe(12);
  });
  it('recusa zero e texto', () => {
    expect(() => lerPorMinuto('0')).toThrow('PNCP_CONSULTA_POR_MINUTO inválido');
    expect(() => lerPorMinuto('abc')).toThrow('PNCP_CONSULTA_POR_MINUTO inválido');
  });
});

describe('lerSupabase', () => {
  it('exige URL e chave', () => {
    expect(() => lerSupabase({})).toThrow('SUPABASE_URL');
  });
  it('devolve URL e chave', () => {
    expect(lerSupabase({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toEqual({
      url: 'https://x.supabase.co',
      chave: 'k',
    });
  });
});
