import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_CONTA } from '@/lib/conta';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  usuario: null as null | { id: string; email: string },
  enviarCodigo: vi.fn(),
  entrarComCodigo: vi.fn(),
  sair: vi.fn(),
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
  lerRadar: vi.fn(),
}));
vi.mock('@/lib/servidor/sessao', () => ({
  usuarioAtual: async () => m.usuario,
  enviarCodigo: m.enviarCodigo,
  entrarComCodigo: m.entrarComCodigo,
  sair: m.sair,
}));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
  hashDoIp: (h: { get(nome: string): string | null }) => h.get('x-forwarded-for'),
}));
vi.mock('@/lib/servidor/conta', () => ({ lerRadar: m.lerRadar }));

const { LIMITES_CONTA } = await import('@/lib/servidor/limiteTentativas');
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
  m.lerRadar.mockResolvedValue(null);
  for (const l of Object.values(LIMITES_CONTA)) l.zerarTudo();
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
  it('grava conta_entrou sem e-mail, dizendo se a conta já tem radar', async () => {
    m.lerRadar.mockResolvedValue({ termos: ['luva'] });
    await entrar.POST(post({ email: 'dono@empresa.com.br', codigo: '123456' }));
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.objectContaining({ interno: false }), 'conta_entrou', { radar: 'sim' });
    expect(JSON.stringify(m.gravarEvento.mock.calls)).not.toContain('@');
  });
  it('falha ao gravar o evento não impede de entrar', async () => {
    m.gravarEvento.mockRejectedValue(new Error('fora'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await entrar.POST(post({ email: 'a@b.co', codigo: '123456' }))).status).toBe(200);
  });
  it('código errado não grava evento', async () => {
    m.entrarComCodigo.mockResolvedValue({ ok: false, erro: { code: 'otp_expired', status: 403 } });
    await entrar.POST(post({ email: 'a@b.co', codigo: '000000' }));
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
});

describe('limite próprio de tentativas (por instância; o Supabase é a segunda camada)', () => {
  const errado = () => m.entrarComCodigo.mockResolvedValue({ ok: false, erro: { code: 'otp_expired', status: 403 } });
  const tentar = (email: string, ip = '1.1.1.1') => entrar.POST(post({ email, codigo: '000000' }, { 'x-forwarded-for': ip }));

  it('entrar: 5 códigos errados no mesmo e-mail → 6ª tentativa leva 429 sem chamar o Supabase', async () => {
    errado();
    for (let i = 0; i < 5; i++) expect((await tentar('Dono@Empresa.com.br', `10.0.0.${i}`)).status).toBe(400);
    m.entrarComCodigo.mockClear();
    const r = await tentar(' dono@empresa.com.br ', '10.0.0.99');
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.muitas });
    expect(m.entrarComCodigo).not.toHaveBeenCalled();
    // outro e-mail segue normal
    expect((await tentar('outro@empresa.com.br', '10.0.0.98')).status).toBe(400);
  });
  it('entrar: 20 códigos errados do mesmo IP (e-mails variados) → 429 sem chamar o Supabase', async () => {
    errado();
    for (let i = 0; i < 20; i++) expect((await tentar(`u${i}@empresa.com.br`, '2.2.2.2')).status).toBe(400);
    m.entrarComCodigo.mockClear();
    expect((await tentar('novo@empresa.com.br', '2.2.2.2')).status).toBe(429);
    expect(m.entrarComCodigo).not.toHaveBeenCalled();
    expect((await tentar('novo@empresa.com.br', '3.3.3.3')).status).toBe(400);
  });
  it('entrar: login certo zera as falhas daquele e-mail', async () => {
    errado();
    for (let i = 0; i < 4; i++) await tentar('a@b.co');
    m.entrarComCodigo.mockResolvedValue({ ok: true, usuario: { id: 'u-1', email: 'a@b.co' } });
    expect((await entrar.POST(post({ email: 'a@b.co', codigo: '123456' }, { 'x-forwarded-for': '9.9.9.9' }))).status).toBe(200);
    errado();
    for (let i = 0; i < 5; i++) expect((await tentar('a@b.co', '9.9.9.9')).status).toBe(400);
    expect((await tentar('a@b.co', '9.9.9.9')).status).toBe(429);
  });
  it('entrar: código mal digitado (não chega ao Supabase) não conta como tentativa', async () => {
    for (let i = 0; i < 6; i++) await entrar.POST(post({ email: 'a@b.co', codigo: '12a' }));
    expect(LIMITES_CONTA.falhasPorEmail.excedido('a@b.co')).toBe(false);
  });
  it('entrar: rajada de 6 pedidos em paralelo no mesmo e-mail chama o Supabase no máximo 5 vezes', async () => {
    m.entrarComCodigo.mockImplementation(
      () => new Promise((ok) => setTimeout(() => ok({ ok: false, erro: { code: 'otp_expired', status: 403 } }), 10)),
    );
    const r = await Promise.all(Array.from({ length: 6 }, (_, i) => tentar('rajada@empresa.com.br', `10.2.0.${i}`)));
    expect(m.entrarComCodigo.mock.calls.length).toBeLessThanOrEqual(5);
    expect(r.map((x) => x.status)).toContain(429);
  });
  it('codigo: 5 pedidos por e-mail por hora → 6º leva 429 sem chamar o Supabase', async () => {
    for (let i = 0; i < 5; i++) expect((await codigo.POST(post({ email: 'a@b.co' }, { 'x-forwarded-for': `10.1.0.${i}` }))).status).toBe(200);
    m.enviarCodigo.mockClear();
    const r = await codigo.POST(post({ email: 'A@B.co' }, { 'x-forwarded-for': '10.1.0.99' }));
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: MENSAGENS_CONTA.muitas });
    expect(m.enviarCodigo).not.toHaveBeenCalled();
  });
  it('codigo: 20 pedidos do mesmo IP por hora → 429 sem chamar o Supabase', async () => {
    for (let i = 0; i < 20; i++) expect((await codigo.POST(post({ email: `u${i}@b.co` }, { 'x-forwarded-for': '4.4.4.4' }))).status).toBe(200);
    m.enviarCodigo.mockClear();
    expect((await codigo.POST(post({ email: 'novo@b.co' }, { 'x-forwarded-for': '4.4.4.4' }))).status).toBe(429);
    expect(m.enviarCodigo).not.toHaveBeenCalled();
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
