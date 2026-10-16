import { describe, expect, it } from 'vitest';
import { lerModalidades, lerPorMinuto, lerPropostaAte, lerSupabase, lerUfs, UF_BRASIL } from './config';

describe('lerUfs', () => {
  it('país inteiro (BR) quando não há valor ou quando o valor é BR', () => {
    expect(lerUfs(undefined)).toEqual([UF_BRASIL]);
    expect(lerUfs('  ')).toEqual(['BR']);
    expect(lerUfs(' br ')).toEqual(['BR']);
  });
  it('recusa BR misturado com UFs', () => {
    expect(() => lerUfs('BR,SC')).toThrow('BR (país inteiro) não se mistura com UFs');
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

describe('lerPropostaAte', () => {
  it('padrão: hoje + 365 dias', () => {
    expect(lerPropostaAte(undefined, '2026-10-16')).toBe('2027-10-16');
  });
  it('aceita aaaa-mm-dd e recusa outro formato', () => {
    expect(lerPropostaAte(' 2026-10-16 ', '2026-10-16')).toBe('2026-10-16');
    expect(() => lerPropostaAte('16/10/2026', '2026-10-16')).toThrow('--proposta-ate inválido');
  });
});
