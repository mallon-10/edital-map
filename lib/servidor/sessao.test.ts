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
  generateLink: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock('./supabase', () => ({ supabaseServidor: () => ({ auth: { admin: { generateLink: m.generateLink, createUser: m.createUser } } }) }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [...m.jarro].map(([name, c]) => ({ name, value: c.value })),
    set: (name: string, value: string, options?: Record<string, unknown>) => m.jarro.set(name, { value, options }),
    delete: (name: string) => m.jarro.delete(name),
  }),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (url: string, chave: string, opcoes: Opcoes) => {
    m.criados.push({ url, chave, opcoes });
    return { auth: { getUser: m.getUser, signInWithOtp: m.signInWithOtp, verifyOtp: m.verifyOtp, signOut: m.signOut } };
  },
}));

const COOKIE = 'sb-omtwaflypzlebjoeubvp-auth-token';
const { entrarComCodigo, enviarCodigo, sair, usuarioAtual } = await import('./sessao');

beforeEach(() => {
  vi.clearAllMocks();
  m.criados.length = 0;
  m.jarro.clear();
  m.jarro.set(COOKIE, { value: 'sessao' });
  vi.stubEnv('SUPABASE_URL', 'https://omtwaflypzlebjoeubvp.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'sb_publishable_teste');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'segredo-que-nao-pode-ir');
  m.getUser.mockResolvedValue({ data: { user: { id: 'u-1', email: 'Dono@Empresa.com.br' } }, error: null });
  m.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  m.verifyOtp.mockResolvedValue({ data: { user: { id: 'u-1', email: 'dono@empresa.com.br' } }, error: null });
  m.signOut.mockResolvedValue({ error: null });
  vi.stubEnv('RESEND_API_KEY', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usuarioAtual', () => {
  it('sem SUPABASE_ANON_KEY: null, sem criar cliente', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(await usuarioAtual()).toBeNull();
    expect(m.criados).toHaveLength(0);
  });
  it('sem cookie sb-* de sessão: null, sem criar cliente nem chamar o Auth', async () => {
    m.jarro.clear();
    m.jarro.set('em_interno', { value: '1' });
    expect(await usuarioAtual()).toBeNull();
    expect(m.criados).toHaveLength(0);
    expect(m.getUser).not.toHaveBeenCalled();
  });
  it('cookie de sessão em pedaços (.0) também conta', async () => {
    m.jarro.clear();
    m.jarro.set(COOKIE + '.0', { value: 'x' });
    expect(await usuarioAtual()).not.toBeNull();
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
  it('sair com o Auth fora do ar: apaga os cookies sb-* à mão (e só eles)', async () => {
    m.jarro.set(COOKIE + '.1', { value: 'y' });
    m.jarro.set('em_interno', { value: '1' });
    m.signOut.mockResolvedValueOnce({ error: { code: 'unexpected_failure', status: 500 } });
    expect(await sair()).toEqual({ ok: false, erro: { code: 'unexpected_failure', status: 500 } });
    expect([...m.jarro.keys()]).toEqual(['em_interno']);
    m.jarro.set(COOKIE, { value: 'z' });
    m.signOut.mockRejectedValueOnce(new Error('rede'));
    await sair();
    expect([...m.jarro.keys()]).toEqual(['em_interno']);
  });
  it('sair encerra só a sessão local', async () => {
    expect(await sair()).toEqual({ ok: true });
    expect(m.signOut).toHaveBeenCalledTimes(1);
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('código por e-mail pelo site (generateLink + Resend)', () => {
  const EMAIL = 'dono@empresa.com.br';
  const CODIGO = '482913';
  const CHAVE = 're_teste_segredo';
  const link = (otp: unknown = CODIGO) => ({ data: { properties: { email_otp: otp, action_link: 'x', hashed_token: 'h' }, user: { id: 'u-1' } }, error: null });
  let buscar: ReturnType<typeof vi.fn>;
  let logs: string[];

  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', CHAVE);
    m.generateLink.mockResolvedValue(link());
    m.createUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    buscar = vi.fn(async () => new Response(JSON.stringify({ id: 'msg-1' }), { status: 200 }));
    vi.stubGlobal('fetch', buscar);
    logs = [];
    const guardar = (...a: unknown[]) => void logs.push(a.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
    for (const nivel of ['error', 'warn', 'log', 'info'] as const) vi.spyOn(console, nivel).mockImplementation(guardar);
  });

  const semSegredos = () => {
    for (const l of logs) {
      expect(l).not.toContain(CODIGO);
      expect(l.toLowerCase()).not.toContain(EMAIL);
      expect(l).not.toContain(CHAVE);
    }
  };

  it('caminho feliz: gera o código no Auth (sem e-mail do Supabase) e manda o modelo da marca pelo Resend', async () => {
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    expect(m.generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: EMAIL });
    expect(m.signInWithOtp).not.toHaveBeenCalled();
    expect(buscar).toHaveBeenCalledTimes(1);
    const [url, init] = buscar.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const cab = init.headers as Record<string, string>;
    expect(cab.authorization).toBe(`Bearer ${CHAVE}`);
    expect(cab['idempotency-key']).toMatch(/^codigo-[0-9a-f]{64}$/);
    expect(cab['idempotency-key']).not.toContain(CODIGO);
    const corpo = JSON.parse(String(init.body));
    expect(corpo.from).toBe('Edital Map <nao-responda@editalmap.com.br>');
    expect(corpo.to).toEqual([EMAIL]);
    expect(corpo.subject).toBe('Seu código do Edital Map');
    expect(corpo.html).toContain(`>${CODIGO}</div>`);
    expect(corpo.html).toContain('Use este código para entrar no Edital Map');
    expect(corpo.html).not.toContain('{{ .Token }}');
    expect(corpo.text).toContain(CODIGO);
    semSegredos();
  });
  it('conta nova: generateLink magiclink já cria (vira signup no Auth); sem createUser', async () => {
    m.generateLink.mockResolvedValueOnce({ ...link(), data: { ...link().data, properties: { ...link().data.properties, verification_type: 'signup' } } });
    expect(await enviarCodigo('novo@empresa.com.br')).toEqual({ ok: true });
    expect(m.createUser).not.toHaveBeenCalled();
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });
  it('conta nova que o Auth não criou (user_not_found): createUser confirmado e gera de novo', async () => {
    m.generateLink.mockResolvedValueOnce({ data: { properties: null, user: null }, error: { code: 'user_not_found', status: 404 } });
    expect(await enviarCodigo('novo@empresa.com.br')).toEqual({ ok: true });
    expect(m.createUser).toHaveBeenCalledWith({ email: 'novo@empresa.com.br', email_confirm: true });
    expect(m.generateLink).toHaveBeenCalledTimes(2);
    expect(m.signInWithOtp).not.toHaveBeenCalled();
  });
  it('generateLink com erro: volta ao e-mail do Supabase (signInWithOtp), sem Resend', async () => {
    m.generateLink.mockResolvedValueOnce({ data: { properties: null, user: null }, error: { code: 'unexpected_failure', status: 500 } });
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    expect(buscar).not.toHaveBeenCalled();
    expect(m.signInWithOtp).toHaveBeenCalledWith({ email: EMAIL, options: { shouldCreateUser: true } });
    expect(logs.length).toBeGreaterThan(0);
    semSegredos();
  });
  it('generateLink estoura ou devolve código fora do formato: volta ao Supabase', async () => {
    m.generateLink.mockRejectedValueOnce(new Error(`rede caiu para ${EMAIL}`));
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    m.generateLink.mockResolvedValueOnce(link('12345678'));
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    expect(buscar).not.toHaveBeenCalled();
    expect(m.signInWithOtp).toHaveBeenCalledTimes(2);
    semSegredos();
  });
  it('Resend recusa (não 2xx) ou cai: volta ao Supabase', async () => {
    buscar.mockResolvedValueOnce(new Response(JSON.stringify({ name: 'validation_error', message: `bad ${EMAIL} ${CODIGO}` }), { status: 422 }));
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    buscar.mockRejectedValueOnce(new Error(`fetch failed ${CODIGO}`));
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    expect(m.signInWithOtp).toHaveBeenCalledTimes(2);
    semSegredos();
  });
  it('fallback devolve o erro do Supabase quando ele também falha', async () => {
    buscar.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    m.signInWithOtp.mockResolvedValueOnce({ data: {}, error: { code: 'over_email_send_rate_limit', status: 429, message: 'x' } });
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: false, erro: { code: 'over_email_send_rate_limit', status: 429 } });
  });
  it('sem RESEND_API_KEY: nem gera o código no Auth, vai direto ao Supabase', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    expect(m.generateLink).not.toHaveBeenCalled();
    expect(buscar).not.toHaveBeenCalled();
    expect(m.signInWithOtp).toHaveBeenCalledTimes(1);
    semSegredos();
  });
  it('sem SUPABASE_ANON_KEY mas com Resend: o site manda o código mesmo assim', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(await enviarCodigo(EMAIL)).toEqual({ ok: true });
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});
