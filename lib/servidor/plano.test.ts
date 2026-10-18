import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  rpcs: [] as Array<{ nome: string; args: Record<string, unknown> }>,
  resposta: { data: 'gratis', error: null } as { data: unknown; error: { message: string } | null },
}));

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: Record<string, unknown>) => {
      m.rpcs.push({ nome, args });
      return Promise.resolve(m.resposta);
    },
  }),
}));

const { planoAtual } = await import('./plano');

const CTX = { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: null };

beforeEach(() => {
  m.rpcs.length = 0;
  m.resposta = { data: 'gratis', error: null };
});

describe('planoAtual', () => {
  it('sem visitante: grátis, sem consultar', async () => {
    expect(await planoAtual(null)).toBe('gratis');
    expect(m.rpcs).toEqual([]);
  });
  it('dono: Pro, sem consultar', async () => {
    expect(await planoAtual({ ...CTX, interno: true, dono: true })).toBe('pro');
    expect(m.rpcs).toEqual([]);
  });
  it('interno sem ser dono consulta como qualquer um', async () => {
    m.resposta = { data: 'basic', error: null };
    expect(await planoAtual({ ...CTX, interno: true })).toBe('basic');
    expect(m.rpcs).toEqual([{ nome: 'plano_do_visitante', args: { p_visitante: CTX.visitante } }]);
  });
  it('valor estranho ou banco fora: grátis', async () => {
    m.resposta = { data: 'diamante', error: null };
    expect(await planoAtual(CTX)).toBe('gratis');
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.resposta = { data: null, error: { message: 'timeout' } };
    expect(await planoAtual(CTX)).toBe('gratis');
    erro.mockRestore();
  });
});
