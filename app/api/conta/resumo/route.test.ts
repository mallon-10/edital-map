import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  mudarResumoSemanal: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ mudarResumoSemanal: m.mudarResumoSemanal }));

const { POST } = await import('./route');
const enviar = (corpo: unknown, extra: Record<string, string> = {}) =>
  POST(new Request('http://localhost/api/conta/resumo', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...extra },
    body: JSON.stringify(corpo),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
});

describe('POST /api/conta/resumo', () => {
  it('liga ou desliga na conta da sessão', async () => {
    expect((await enviar({ ligado: false })).status).toBe(200);
    expect(m.mudarResumoSemanal).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-sessao' }), false);
  });
  it('corpo errado 400; sem sessão 401; outro site 403', async () => {
    expect((await enviar({ ligado: 'sim' })).status).toBe(400);
    expect((await enviar({ ligado: true }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    m.usuario = null;
    expect((await enviar({ ligado: true })).status).toBe(401);
    expect(m.mudarResumoSemanal).not.toHaveBeenCalled();
  });
});
