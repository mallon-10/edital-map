import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_RADAR } from '@/lib/radar';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  salvarRadar: vi.fn(),
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
  planoDaConta: vi.fn(),
  contarAlertas: vi.fn(),
  criarAlerta: vi.fn(),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({ salvarRadar: m.salvarRadar, planoDaConta: m.planoDaConta }));
vi.mock('@/lib/servidor/alertas', () => ({ contarAlertas: m.contarAlertas, criarAlerta: m.criarAlerta }));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
}));

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
  m.planoDaConta.mockResolvedValue({ plano: 'pro', daConta: 'pro', doNavegador: 'gratis', falhou: false });
  m.contarAlertas.mockResolvedValue(0);
  m.criarAlerta.mockResolvedValue('alerta-1');
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
    expect(await r.json()).toEqual({ ok: true, alerta: true });
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
  it('radar novo: onboarding_concluido com as contagens (sem e-mail nem termos)', async () => {
    await enviar({ termos: ['luva', 'botina'], municipios: ['4209102'] });
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'onboarding_concluido', { termos: 2, ufs: 0, municipios: 1 });
  });
  it('edição (radar já existia): sem onboarding_concluido', async () => {
    m.salvarRadar.mockResolvedValue('atualizado');
    await enviar({ termos: ['luva'] });
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('radar novo do Pro sem alertas: cria o alerta diário com os mesmos filtros', async () => {
    const r = await enviar({ termos: ['luva', 'botina'], ufs: ['SC'] });
    expect(await r.json()).toEqual({ ok: true, alerta: true });
    const [usuario, alerta] = m.criarAlerta.mock.calls[0] as [{ id: string }, Record<string, unknown>];
    expect(usuario.id).toBe('u-sessao');
    expect(alerta).toMatchObject({ nome: 'luva, botina', termos: ['luva', 'botina'], ufs: ['SC'] });
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'alerta_criado', {
      termos: 2, ufs: 1, municipios: 0, origem: 'onboarding', plano: 'pro',
    });
  });
  it('sem alerta automático: edição, conta que já tem alerta, grátis ou plano incerto', async () => {
    m.salvarRadar.mockResolvedValueOnce('atualizado');
    expect(await (await enviar({ termos: ['luva'] })).json()).toEqual({ ok: true });
    m.contarAlertas.mockResolvedValueOnce(1);
    expect(await (await enviar({ termos: ['luva'] })).json()).toEqual({ ok: true });
    m.planoDaConta.mockResolvedValueOnce({ plano: 'gratis', daConta: 'gratis', doNavegador: 'gratis', falhou: false });
    expect(await (await enviar({ termos: ['luva'] })).json()).toEqual({ ok: true });
    m.planoDaConta.mockResolvedValueOnce({ plano: 'gratis', daConta: 'gratis', doNavegador: 'gratis', falhou: true });
    expect(await (await enviar({ termos: ['luva'] })).json()).toEqual({ ok: true });
    expect(m.criarAlerta).not.toHaveBeenCalled();
  });
  it('falha ao criar o alerta não perde o radar: 200 sem alerta', async () => {
    m.criarAlerta.mockRejectedValue(new Error('fora'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await enviar({ termos: ['luva'] });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });
  it('banco fora: 502', async () => {
    m.salvarRadar.mockRejectedValue(new Error('fora'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await enviar({ termos: ['luva'] })).status).toBe(502);
  });
});
