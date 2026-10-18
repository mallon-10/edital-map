import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type SetAll = (l: Array<{ name: string; value: string; options: Record<string, unknown> }>, h?: Record<string, string>) => void;
const m = vi.hoisted(() => ({ criados: 0, setAll: null as SetAll | null, getUser: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_u: string, _c: string, o: { cookies: { setAll: SetAll } }) => {
    m.criados++;
    m.setAll = o.cookies.setAll;
    return { auth: { getUser: m.getUser } };
  },
}));

const { renovarSessao } = await import('./sessaoProxy');
const pedido = () => new NextRequest('http://localhost/radar', { headers: { cookie: 'sb-omtwaflypzlebjoeubvp-auth-token=velho' } });

beforeEach(() => {
  m.criados = 0;
  m.getUser.mockReset();
  vi.stubEnv('SUPABASE_URL', 'https://omtwaflypzlebjoeubvp.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'sb_publishable_teste');
});
afterEach(() => vi.unstubAllEnvs());

describe('renovarSessao', () => {
  it('sem chave: segue sem falar com o Supabase', async () => {
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    const r = await renovarSessao(pedido());
    expect(r.status).toBe(200);
    expect(m.criados).toBe(0);
  });
  it('confere a sessão e grava os cookies renovados httpOnly na resposta', async () => {
    m.getUser.mockImplementation(async () => {
      m.setAll!([{ name: 'sb-omtwaflypzlebjoeubvp-auth-token', value: 'novo', options: { maxAge: 400, httpOnly: false } }], { 'Cache-Control': 'private, no-store' });
      return { data: { user: { id: 'u-1' } }, error: null };
    });
    const r = await renovarSessao(pedido());
    expect(m.getUser).toHaveBeenCalledTimes(1);
    const c = r.cookies.get('sb-omtwaflypzlebjoeubvp-auth-token');
    expect(c?.value).toBe('novo');
    expect(c?.httpOnly).toBe(true);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
  it('falha do Supabase não derruba a página', async () => {
    m.getUser.mockRejectedValue(new Error('rede'));
    const r = await renovarSessao(pedido());
    expect(r.status).toBe(200);
  });
});
