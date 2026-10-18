import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_CONTA } from '@/lib/conta';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  usuario: null as null | { id: string; email: string },
  enviarCodigo: vi.fn(),
  entrarComCodigo: vi.fn(),
  sair: vi.fn(),
}));
vi.mock('@/lib/servidor/sessao', () => ({
  usuarioAtual: async () => m.usuario,
  enviarCodigo: m.enviarCodigo,
  entrarComCodigo: m.entrarComCodigo,
  sair: m.sair,
}));

const conta = await import('./route');
const codigo = await import('./codigo/route');
const entrar = await import('./entrar/route');
const sairRota = await import('./sair/route');

const post = (corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  new Request('http://localhost/api/conta/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...cabecalhos },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = null;
  m.enviarCodigo.mockResolvedValue({ ok: true });
  m.entrarComCodigo.mockResolvedValue({ ok: true, usuario: { id: 'u-1', email: 'dono@empresa.com.br' } });
  m.sair.mockResolvedValue(undefined);
});

describe('GET /api/conta', () => {
  it('sem sessão: email nulo, sem cache', async () => {
    const r = await conta.GET();
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ email: null });
  });
  it('com sessão: só o e-mail (nunca o id)', async () => {
    m.usuario = { id: 'u-1', email: 'dono@empresa.com.br' };
    expect(await (await conta.GET()).json()).toEqual({ email: 'dono@empresa.com.br' });
  });
});

describe('POST /api/conta/codigo', () => {
  it('e-mail válido: pede o código ao Supabase', async () => {
    const r = await codigo.POST(post({ email: ' Dono@Empresa.com.br ' }));
    expect(r.status).toBe(200);
    expect(m.enviarCodigo).toHaveBeenCalledWith('dono@empresa.com.br');
  });
  it('e-mail ruim ou JSON inválido: 400 sem chamar o Supabase', async () => {
    const r = await codigo.POST(post({ email: 'x' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.email });
    expect((await codigo.POST(post('{nao-json'))).status).toBe(400);
    expect(m.enviarCodigo).not.toHaveBeenCalled();
  });
  it('limite do Supabase: 429 com a mensagem em português', async () => {
    m.enviarCodigo.mockResolvedValue({ ok: false, erro: { code: 'over_email_send_rate_limit', status: 429 } });
    const r = await codigo.POST(post({ email: 'a@b.co' }));
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.muitas });
  });
});

describe('POST /api/conta/entrar', () => {
  it('código certo: devolve o destino seguro', async () => {
    const r = await entrar.POST(post({ email: 'dono@empresa.com.br', codigo: '123456', destino: '/radar/editar' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ destino: '/radar/editar' });
    expect(m.entrarComCodigo).toHaveBeenCalledWith('dono@empresa.com.br', '123456');
  });
  it('destino de fora do site vira /radar', async () => {
    const r = await entrar.POST(post({ email: 'a@b.co', codigo: '123456', destino: 'https://mal.com' }));
    expect(await r.json()).toEqual({ destino: '/radar' });
  });
  it('código mal digitado: 400 sem chamar o Supabase', async () => {
    const r = await entrar.POST(post({ email: 'a@b.co', codigo: '12a' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.codigo });
    expect(m.entrarComCodigo).not.toHaveBeenCalled();
  });
  it('código errado ou expirado: 400 com a mensagem', async () => {
    m.entrarComCodigo.mockResolvedValue({ ok: false, erro: { code: 'otp_expired', status: 403 } });
    const r = await entrar.POST(post({ email: 'a@b.co', codigo: '000000' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.codigoErrado });
  });
});

describe('POST /api/conta/sair', () => {
  it('encerra a sessão: 204', async () => {
    const r = await sairRota.POST(post({}));
    expect(r.status).toBe(204);
    expect(m.sair).toHaveBeenCalledTimes(1);
  });
});

describe('CSRF: só JSON do próprio site', () => {
  const rotas = [
    ['codigo', () => codigo.POST, { email: 'a@b.co' }, () => m.enviarCodigo],
    ['entrar', () => entrar.POST, { email: 'a@b.co', codigo: '123456' }, () => m.entrarComCodigo],
    ['sair', () => sairRota.POST, {}, () => m.sair],
  ] as const;
  for (const [nome, rota, corpo, chamada] of rotas) {
    it(`${nome}: formulário text/plain de outro site → 403 sem chamar o Supabase`, async () => {
      const r = await rota()(post(JSON.stringify(corpo), { 'content-type': 'text/plain', 'sec-fetch-site': 'cross-site' }));
      expect(r.status).toBe(403);
      expect(chamada()).not.toHaveBeenCalled();
    });
    it(`${nome}: JSON com Sec-Fetch-Site cross-site → 403`, async () => {
      expect((await rota()(post(corpo, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
      expect(chamada()).not.toHaveBeenCalled();
    });
    it(`${nome}: text/plain mesmo do próprio site → 403`, async () => {
      expect((await rota()(post(JSON.stringify(corpo), { 'content-type': 'text/plain' }))).status).toBe(403);
    });
    it(`${nome}: JSON do próprio site (Origin igual, sem Sec-Fetch-Site) passa`, async () => {
      const req = new Request('http://localhost/api/conta/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify(corpo),
      });
      expect((await rota()(req)).status).toBeLessThan(300);
      expect(chamada()).toHaveBeenCalledTimes(1);
    });
  }
});
