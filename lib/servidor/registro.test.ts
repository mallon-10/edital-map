import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => new Headers() }));

const m = vi.hoisted(() => ({
  existentes: [] as Array<{ id: number }>,
  filtros: [] as Array<[string, unknown]>,
  inseridos: [] as Array<Record<string, unknown>>,
  erroLeitura: null as null | { message: string },
}));

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    from: (tabela: string) => {
      const consulta = {
        select: () => consulta,
        eq: (coluna: string, valor: unknown) => {
          m.filtros.push([`${tabela}.${coluna}`, valor]);
          return consulta;
        },
        limit: async () => ({ data: m.erroLeitura ? null : m.existentes, error: m.erroLeitura }),
        insert: async (linha: Record<string, unknown>) => {
          m.inseridos.push(linha);
          return { error: null };
        },
      };
      return consulta;
    },
  }),
}));

const { gravarEventoUmaVez } = await import('./registro');

const CTX = { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: null };

beforeEach(() => {
  m.existentes = [];
  m.filtros = [];
  m.inseridos = [];
  m.erroLeitura = null;
});

describe('gravarEventoUmaVez', () => {
  it('primeira vez deste visitante: grava', async () => {
    expect(await gravarEventoUmaVez(CTX, 'onboarding_iniciado', {})).toBe(true);
    expect(m.filtros).toEqual([
      ['eventos.tipo', 'onboarding_iniciado'],
      ['eventos.visitante', CTX.visitante],
    ]);
    expect(m.inseridos).toEqual([{ visitante: CTX.visitante, tipo: 'onboarding_iniciado', detalhe: {}, interno: false, ip_hash: null }]);
  });
  it('já existe o evento para o visitante (recarregar, voltar): não grava de novo', async () => {
    m.existentes = [{ id: 1 }];
    expect(await gravarEventoUmaVez(CTX, 'onboarding_iniciado', {})).toBe(false);
    expect(m.inseridos).toEqual([]);
  });
  it('erro ao ler: lança (quem chama só registra no log)', async () => {
    m.erroLeitura = { message: 'fora' };
    await expect(gravarEventoUmaVez(CTX, 'onboarding_iniciado', {})).rejects.toThrow('fora');
    expect(m.inseridos).toEqual([]);
  });
});
