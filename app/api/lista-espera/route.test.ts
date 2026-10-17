import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITES } from '@/lib/eventos';

const m = vi.hoisted(() => ({
  ctx: { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: 'hash-do-ip' },
  dentroDoLimite: vi.fn(async (..._a: unknown[]) => true),
  gravarListaEspera: vi.fn(async (..._a: unknown[]) => undefined),
}));

vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => m.ctx,
  dentroDoLimite: m.dentroDoLimite,
  gravarListaEspera: m.gravarListaEspera,
}));

const { POST } = await import('./route');

const enviar = (corpo: unknown) =>
  POST(
    new Request('http://localhost/api/lista-espera', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.dentroDoLimite.mockResolvedValue(true);
  m.gravarListaEspera.mockResolvedValue(undefined);
});

describe('/api/lista-espera', () => {
  it('grava e responde 201', async () => {
    const r = await enviar({ email: 'Joao@Empresa.com.br', plano: 'pro' });
    expect(r.status).toBe(201);
    expect(m.dentroDoLimite).toHaveBeenCalledWith('lista_espera', 'hash-do-ip', LIMITES.listaEsperaPorHora);
    expect(m.gravarListaEspera).toHaveBeenCalledWith(m.ctx, { email: 'joao@empresa.com.br', plano: 'pro' });
  });
  it('e-mail ruim: 400 com a mensagem, sem gravar', async () => {
    const r = await enviar({ email: 'x', plano: 'basic' });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: 'Confira o e-mail.' });
    expect(m.gravarListaEspera).not.toHaveBeenCalled();
  });
  it('JSON inválido: 400', async () => {
    expect((await enviar('{nao-e-json')).status).toBe(400);
  });
  it('robô: 200 sem gravar', async () => {
    const r = await enviar({ email: 'a@b.co', plano: 'pro', site: 'spam' });
    expect(r.status).toBe(200);
    expect(m.gravarListaEspera).not.toHaveBeenCalled();
  });
  it('muitos envios do mesmo IP: 429', async () => {
    m.dentroDoLimite.mockResolvedValue(false);
    const r = await enviar({ email: 'a@b.co', plano: 'pro' });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'Muitos pedidos deste endereço. Tente de novo mais tarde.' });
  });
  it('falha ao gravar: 500 em português', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.gravarListaEspera.mockRejectedValue(new Error('banco fora'));
    const r = await enviar({ email: 'a@b.co', plano: 'pro' });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ erro: 'Não deu para registrar agora. Tente de novo.' });
    erro.mockRestore();
  });
});
