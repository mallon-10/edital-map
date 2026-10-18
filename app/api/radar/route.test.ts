import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_RADAR } from '@/lib/radar';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  salvarRadar: vi.fn(),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ salvarRadar: m.salvarRadar }));

const { POST } = await import('./route');
const enviar = (corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  POST(
    new Request('http://localhost/api/radar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...cabecalhos },
      body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
  m.salvarRadar.mockResolvedValue('criado');
});

describe('POST /api/radar', () => {
  it('pedido de outro site ou sem JSON: 403 sem gravar', async () => {
    const cabecalhos: Record<string, string>[] = [{ 'sec-fetch-site': 'cross-site' }, { 'content-type': 'text/plain' }];
    for (const cab of cabecalhos) {
      const r = await enviar({ termos: ['luva'] }, cab);
      expect(r.status).toBe(403);
      expect(r.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(m.salvarRadar).not.toHaveBeenCalled();
  });
  it('sem sessão: 401 sem gravar', async () => {
    m.usuario = null;
    const r = await enviar({ termos: ['luva'] });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: 'Entre para salvar seu radar.' });
    expect(m.salvarRadar).not.toHaveBeenCalled();
  });
  it('grava no usuário da sessão; user_id do corpo é ignorado', async () => {
    const r = await enviar({ termos: ['luva'], ufs: ['SC'], user_id: 'outra-conta' });
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ ok: true });
    const [usuario, radar] = m.salvarRadar.mock.calls[0] as [{ id: string }, Record<string, unknown>];
    expect(usuario.id).toBe('u-sessao');
    expect(radar).not.toHaveProperty('user_id');
    expect(radar).toMatchObject({ termos: ['luva'], ufs: ['SC'] });
  });
  it('radar inválido ou JSON quebrado: 400 com a mensagem', async () => {
    const r = await enviar({ termos: [] });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_RADAR.semTermo });
    const quebrado = await enviar('{x');
    expect(quebrado.status).toBe(400);
    expect(await quebrado.json()).toEqual({ erro: MENSAGENS_RADAR.formulario });
    expect(m.salvarRadar).not.toHaveBeenCalled();
  });
  it('banco fora: 502', async () => {
    m.salvarRadar.mockRejectedValue(new Error('fora'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await enviar({ termos: ['luva'] })).status).toBe(502);
  });
});
