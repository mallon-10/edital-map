import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_ALERTA, TetoDeAlertas } from '@/lib/alertas/regras';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';

vi.mock('server-only', () => ({}));

const ID = '11111111-1111-4111-8111-111111111111';
const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  plano: 'pro' as 'gratis' | 'pro',
  falhou: false,
  qtd: 0,
  criarAlerta: vi.fn(),
  atualizarAlerta: vi.fn(),
  mudarAtivoAlerta: vi.fn(),
  excluirAlerta: vi.fn(),
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({
  planoDaConta: async () => ({ plano: m.plano, daConta: m.plano, doNavegador: 'gratis', falhou: m.falhou }),
}));
vi.mock('@/lib/servidor/alertas', () => ({
  contarAlertas: async () => m.qtd,
  criarAlerta: m.criarAlerta, atualizarAlerta: m.atualizarAlerta, mudarAtivoAlerta: m.mudarAtivoAlerta, excluirAlerta: m.excluirAlerta,
}));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
}));

const { POST } = await import('./route');
const porId = await import('./[id]/route');
const cab = { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
const req = (url: string, metodo: string, corpo: unknown, extra: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, {
    method: metodo,
    headers: { ...cab, ...extra },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const CORPO = { nome: 'Uniformes', termos: ['uniforme'], ufs: ['SC'] };
const QUEBRADO = '{x';

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
  m.plano = 'pro';
  m.falhou = false;
  m.qtd = 0;
  m.criarAlerta.mockResolvedValue(ID);
  m.atualizarAlerta.mockResolvedValue(true);
  m.mudarAtivoAlerta.mockResolvedValue(true);
  m.excluirAlerta.mockResolvedValue(true);
});

describe('POST /api/alertas', () => {
  it('outro site 403; sem sessão 401', async () => {
    expect((await POST(req('/api/alertas', 'POST', CORPO, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    m.usuario = null;
    const r = await POST(req('/api/alertas', 'POST', CORPO));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' });
    expect(m.criarAlerta).not.toHaveBeenCalled();
  });
  it('grátis: 402 plano; Pro com 5: 402 limite', async () => {
    m.plano = 'gratis';
    expect(await (await POST(req('/api/alertas', 'POST', CORPO))).json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.alertasPlano, codigo: 'plano' });
    m.plano = 'pro';
    m.qtd = 5;
    const r = await POST(req('/api/alertas', 'POST', CORPO));
    expect(r.status).toBe(402);
    expect((await r.json()).codigo).toBe('limite');
    expect(m.criarAlerta).not.toHaveBeenCalled();
  });
  it('plano não confirmado (banco fora na conta): 503 tente de novo, não o convite ao Pro', async () => {
    m.plano = 'gratis';
    m.falhou = true;
    const r = await POST(req('/api/alertas', 'POST', CORPO));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.planoIndisponivel });
    expect(m.criarAlerta).not.toHaveBeenCalled();
  });
  it('cria na conta da sessão (user_id do corpo ignorado) e conta alerta_criado sem e-mail', async () => {
    const r = await POST(req('/api/alertas', 'POST', { ...CORPO, user_id: 'outra', origem: 'radar' }));
    expect(r.status).toBe(201);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(await r.json()).toEqual({ ok: true, id: ID });
    const [usuario, alerta] = m.criarAlerta.mock.calls[0] as [{ id: string }, Record<string, unknown>];
    expect(usuario.id).toBe('u-sessao');
    expect(alerta).not.toHaveProperty('user_id');
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'alerta_criado', { termos: 1, ufs: 1, municipios: 0, origem: 'radar', plano: 'pro' });
  });
  it('corrida: o teto do banco (0018) responde o mesmo 402 limite da conferência de antes', async () => {
    m.qtd = 5;
    const antes = await (await POST(req('/api/alertas', 'POST', CORPO))).json();
    m.qtd = 4;
    m.criarAlerta.mockRejectedValue(new TetoDeAlertas());
    const r = await POST(req('/api/alertas', 'POST', CORPO));
    expect(r.status).toBe(402);
    expect(await r.json()).toEqual(antes);
    expect(antes.codigo).toBe('limite');
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('evento fora do ar não derruba a criação', async () => {
    m.gravarEvento.mockRejectedValueOnce(new Error('fora'));
    expect((await POST(req('/api/alertas', 'POST', CORPO))).status).toBe(201);
  });
  it('inválido 400; banco fora 502', async () => {
    expect((await POST(req('/api/alertas', 'POST', { ...CORPO, nome: '' }))).status).toBe(400);
    expect((await POST(req('/api/alertas', 'POST', QUEBRADO))).status).toBe(400);
    m.criarAlerta.mockRejectedValue(new Error('fora'));
    expect((await POST(req('/api/alertas', 'POST', CORPO))).status).toBe(502);
  });
});

describe('PATCH e DELETE /api/alertas/{id}', () => {
  it('pausar e retomar', async () => {
    const r = await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: false }), params(ID));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(m.mudarAtivoAlerta).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-sessao' }), ID, false);
  });
  it('editar o alerta inteiro', async () => {
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', CORPO), params(ID))).status).toBe(200);
    const [usuario, id, alerta] = m.atualizarAlerta.mock.calls[0] as [{ id: string }, string, Record<string, unknown>];
    expect(usuario.id).toBe('u-sessao');
    expect(id).toBe(ID);
    expect(alerta).toMatchObject({ nome: 'Uniformes', termos: ['uniforme'] });
  });
  it('editar não deixa passar id, user_id, criado_em, ultimo_envio_em nem ativo do corpo', async () => {
    const corpo = { ...CORPO, ultimo_envio_em: '2020-01-01T00:00:00Z', id: 'outro', user_id: 'outra', criado_em: 'c', ativo: false };
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', corpo), params(ID))).status).toBe(200);
    const [usuario, id, alerta] = m.atualizarAlerta.mock.calls[0] as [{ id: string }, string, Record<string, unknown>];
    expect(usuario.id).toBe('u-sessao');
    expect(id).toBe(ID);
    for (const campo of ['ultimo_envio_em', 'id', 'user_id', 'criado_em', 'ativo']) expect(alerta).not.toHaveProperty(campo);
    expect(m.mudarAtivoAlerta).not.toHaveBeenCalled();
  });
  it('{ ativo } que não é booleano: 400 formulário inválido', async () => {
    const r = await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: 'sim' }), params(ID));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: MENSAGENS_ALERTA.formulario });
  });
  it('corpo inválido 400; banco fora 502', async () => {
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: 'sim' }), params(ID))).status).toBe(400);
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', QUEBRADO), params(ID))).status).toBe(400);
    m.mudarAtivoAlerta.mockRejectedValue(new Error('fora'));
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: true }), params(ID))).status).toBe(502);
    m.excluirAlerta.mockRejectedValue(new Error('fora'));
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}), params(ID))).status).toBe(502);
  });
  it('id inválido ou de outra conta: 404; outro site 403; sem sessão 401', async () => {
    expect((await porId.PATCH(req('/api/alertas/1', 'PATCH', { ativo: false }), params('1'))).status).toBe(404);
    m.mudarAtivoAlerta.mockResolvedValue(false);
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: false }), params(ID))).status).toBe(404);
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: false }, { 'sec-fetch-site': 'cross-site' }), params(ID))).status).toBe(403);
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}, { 'sec-fetch-site': 'cross-site' }), params(ID))).status).toBe(403);
    m.usuario = null;
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}), params(ID))).status).toBe(401);
    expect((await porId.PATCH(req(`/api/alertas/${ID}`, 'PATCH', { ativo: false }), params(ID))).status).toBe(401);
    expect(m.excluirAlerta).not.toHaveBeenCalled();
  });
  it('excluir', async () => {
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}), params(ID))).status).toBe(200);
    m.excluirAlerta.mockResolvedValue(false);
    expect((await porId.DELETE(req(`/api/alertas/${ID}`, 'DELETE', {}), params(ID))).status).toBe(404);
  });
});
