import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

type Opcoes = { cookies: { getAll: () => unknown; setAll: (l: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void } };
const m = vi.hoisted(() => ({
  criados: [] as Array<{ url: string; chave: string; opcoes: Opcoes }>,
  jarro: new Map<string, { value: string; options?: Record<string, unknown> }>(),
  getUser: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [...m.jarro].map(([name, c]) => ({ name, value: c.value })),
    set: (name: string, value: string, options?: Record<string, unknown>) => m.jarro.set(name, { value, options }),
  }),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (url: string, chave: string, opcoes: Opcoes) => {
    m.criados.push({ url, chave, opcoes });
    return { auth: { getUser: m.getUser, signInWithOtp: m.signInWithOtp, verifyOtp: m.verifyOtp, signOut: m.signOut } };
  },
}));

const { entrarComCodigo, enviarCodigo, sair, usuarioAtual } = await import('./sessao');

beforeEach(() => {
  vi.clearAllMocks();
  m.criados.length = 0;
  m.jarro.clear();
  vi.stubEnv('SUPABASE_URL', 'https://omtwaflypzlebjoeubvp.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'sb_publishable_teste');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'segredo-que-nao-pode-ir');
  m.getUser.mockResolvedValue({ data: { user: { id: 'u-1', email: 'Dono@Empresa.com.br' } }, error: null });
  m.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  m.verifyOtp.mockResolvedValue({ data: { user: { id: 'u-1', email: 'dono@empresa.com.br' } }, error: null });
  m.signOut.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('usuarioAtual', () => {
  it('sem SUPABASE_ANON_KEY: null, sem criar cliente', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(await usuarioAtual()).toBeNull();
    expect(m.criados).toHaveLength(0);
  });
  it('usa a chave publicável (nunca a service role) e devolve o usuário do auth.getUser()', async () => {
    const u = await usuarioAtual();
    expect(u).toEqual({ id: 'u-1', email: 'dono@empresa.com.br' });
    expect(m.criados[0].url).toBe('https://omtwaflypzlebjoeubvp.supabase.co');
    expect(m.criados[0].chave).toBe('sb_publishable_teste');
    expect(m.getUser).toHaveBeenCalledTimes(1);
  });
  it('sessão inválida, erro de rede ou usuário sem e-mail: null', async () => {
    m.getUser.mockResolvedValueOnce({ data: { user: null }, error: { code: 'session_not_found', status: 403 } });
    expect(await usuarioAtual()).toBeNull();
    m.getUser.mockRejectedValueOnce(new Error('rede'));
    expect(await usuarioAtual()).toBeNull();
    m.getUser.mockResolvedValueOnce({ data: { user: { id: 'u-2', email: null } }, error: null });
    expect(await usuarioAtual()).toBeNull();
  });
  it('cookies gravados pelo cliente de sessão saem httpOnly, mantendo o prazo', async () => {
    await usuarioAtual();
    m.criados[0].opcoes.cookies.setAll([{ name: 'sb-omtwaflypzlebjoeubvp-auth-token', value: 'v', options: { maxAge: 100, httpOnly: false } }]);
    expect(m.jarro.get('sb-omtwaflypzlebjoeubvp-auth-token')).toEqual({
      value: 'v',
      options: expect.objectContaining({ maxAge: 100, httpOnly: true, sameSite: 'lax', path: '/' }),
    });
  });
});

describe('código por e-mail', () => {
  it('enviarCodigo pede o código e cria a conta no primeiro acesso', async () => {
    expect(await enviarCodigo('dono@empresa.com.br')).toEqual({ ok: true });
    expect(m.signInWithOtp).toHaveBeenCalledWith({ email: 'dono@empresa.com.br', options: { shouldCreateUser: true } });
  });
  it('enviarCodigo devolve o código e o status do erro do Supabase', async () => {
    m.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { code: 'over_email_send_rate_limit', status: 429, message: 'x' } });
    expect(await enviarCodigo('a@b.co')).toEqual({ ok: false, erro: { code: 'over_email_send_rate_limit', status: 429 } });
  });
  it('enviarCodigo sem chave: falha sem chamar o Supabase', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(await enviarCodigo('a@b.co')).toEqual({ ok: false, erro: { code: 'sem_chave', status: null } });
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });
  it('entrarComCodigo confere o código do tipo e-mail e devolve o usuário', async () => {
    expect(await entrarComCodigo('dono@empresa.com.br', '123456')).toEqual({ ok: true, usuario: { id: 'u-1', email: 'dono@empresa.com.br' } });
    expect(m.verifyOtp).toHaveBeenCalledWith({ email: 'dono@empresa.com.br', token: '123456', type: 'email' });
  });
  it('entrarComCodigo com código errado: erro otp_expired', async () => {
    m.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: { code: 'otp_expired', status: 403, message: 'x' } });
    expect(await entrarComCodigo('a@b.co', '000000')).toEqual({ ok: false, erro: { code: 'otp_expired', status: 403 } });
  });
  it('exceção do Supabase ou dos cookies vira erro "falha" (sem estourar)', async () => {
    m.signInWithOtp.mockRejectedValueOnce(new Error('rede'));
    expect(await enviarCodigo('a@b.co')).toEqual({ ok: false, erro: { code: 'falha', status: null } });
    m.verifyOtp.mockRejectedValueOnce(new Error('rede'));
    expect(await entrarComCodigo('a@b.co', '123456')).toEqual({ ok: false, erro: { code: 'falha', status: null } });
    m.signOut.mockRejectedValueOnce(new Error('rede'));
    expect(await sair()).toEqual({ ok: false, erro: { code: 'falha', status: null } });
  });
  it('sair encerra só a sessão local', async () => {
    expect(await sair()).toEqual({ ok: true });
    expect(m.signOut).toHaveBeenCalledTimes(1);
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
