import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({ usuario: null as null | { id: string; email: string }, marcarVisitaRadar: vi.fn() }));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ marcarVisitaRadar: m.marcarVisitaRadar }));
const { POST } = await import('./route');

const enviar = (cabecalhos: Record<string, string> = {}) =>
  POST(
    new Request('http://localhost/api/radar/visita', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...cabecalhos },
      body: '{}',
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = null;
  m.marcarVisitaRadar.mockResolvedValue(undefined);
});

describe('POST /api/radar/visita', () => {
  it('pedido de outro site ou sem JSON: 403 sem gravar', async () => {
    m.usuario = { id: 'u-sessao', email: 'a@b.co' };
    expect((await enviar({ 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await enviar({ 'content-type': 'text/plain' })).status).toBe(403);
    expect(m.marcarVisitaRadar).not.toHaveBeenCalled();
  });
  it('sem sessão: 401', async () => {
    const r = await enviar();
    expect(r.status).toBe(401);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(m.marcarVisitaRadar).not.toHaveBeenCalled();
  });
  it('com sessão: grava a visita do usuário da sessão', async () => {
    m.usuario = { id: 'u-sessao', email: 'a@b.co' };
    expect((await enviar()).status).toBe(204);
    expect(m.marcarVisitaRadar).toHaveBeenCalledWith(m.usuario);
  });
  it('banco fora: 502', async () => {
    m.usuario = { id: 'u-sessao', email: 'a@b.co' };
    m.marcarVisitaRadar.mockRejectedValue(new Error('fora'));
    expect((await enviar()).status).toBe(502);
  });
});
