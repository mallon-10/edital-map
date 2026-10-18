import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSupabaseFalso } from './supabaseFalso';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({
  falso: null as ReturnType<typeof import('./supabaseFalso').criarSupabaseFalso> | null,
  usuario: null as { id: string; email: string } | null,
}));
vi.mock('./supabase', () => ({ supabaseServidor: () => m.falso!.cliente }));
vi.mock('./sessao', () => ({ usuarioAtual: async () => m.usuario }));

const { planoAtual } = await import('./plano');

const CTX = { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: null };
let f: ReturnType<typeof criarSupabaseFalso>;

beforeEach(() => {
  f = criarSupabaseFalso();
  m.falso = f;
  m.usuario = null;
});

describe('planoAtual', () => {
  it('sem visitante e sem conta: grátis, sem consultar', async () => {
    expect(await planoAtual(null)).toBe('gratis');
    expect(f.operacoes).toEqual([]);
  });
  it('dono: Pro, sem consultar', async () => {
    expect(await planoAtual({ ...CTX, interno: true, dono: true })).toBe('pro');
    expect(f.operacoes).toEqual([]);
  });
  it('assinatura ligada ao navegador: Pro', async () => {
    f.responder('rpc:plano_do_visitante', { data: 'pro', error: null });
    expect(await planoAtual(CTX)).toBe('pro');
    expect(f.operacoes[0]).toMatchObject({ alvo: 'rpc:plano_do_visitante', valores: { p_visitante: CTX.visitante } });
  });
  it('navegador grátis, mas a conta logada tem assinatura válida pelo e-mail: Pro', async () => {
    m.usuario = { id: 'u1', email: 'maria@exemplo.com' };
    f.responder('rpc:plano_do_visitante', { data: 'gratis', error: null });
    f.responder('assinaturas', { data: [{ id: 'a1' }], error: null });
    expect(await planoAtual(CTX)).toBe('pro');
    const busca = f.operacoes.find((o) => o.alvo === 'assinaturas')!;
    expect(busca.filtros).toContainEqual(['eq:email', 'maria@exemplo.com']);
    expect(busca.filtros).toContainEqual(['neq:status', 'estornada']);
    expect(busca.filtros.some(([k]) => k === 'gt:valido_ate')).toBe(true);
  });
  it('conta sem assinatura: grátis', async () => {
    m.usuario = { id: 'u1', email: 'outra@exemplo.com' };
    f.responder('rpc:plano_do_visitante', { data: 'gratis', error: null });
    f.responder('assinaturas', { data: [], error: null });
    expect(await planoAtual(CTX)).toBe('gratis');
  });
  it('conta logada sem cookie de visitante (ctx null) ainda vale', async () => {
    m.usuario = { id: 'u1', email: 'maria@exemplo.com' };
    f.responder('assinaturas', { data: [{ id: 'a1' }], error: null });
    expect(await planoAtual(null)).toBe('pro');
  });
  it('valor antigo "basic" e banco fora: grátis', async () => {
    f.responder('rpc:plano_do_visitante', { data: 'basic', error: null });
    expect(await planoAtual(CTX)).toBe('gratis');
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    f.responder('rpc:plano_do_visitante', { data: null, error: { message: 'timeout' } });
    expect(await planoAtual(CTX)).toBe('gratis');
    erro.mockRestore();
  });
});
