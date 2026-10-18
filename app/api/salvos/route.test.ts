import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import { MENSAGENS_SALVOS } from '@/lib/salvos';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  usuario: { id: 'u-sessao', email: 'dono@empresa.com.br' } as null | { id: string; email: string },
  plano: 'pro' as 'gratis' | 'pro',
  falhou: false,
  gravarSalvo: vi.fn(),
  mudarObservacao: vi.fn(),
  removerSalvo: vi.fn(),
  estadoDosSalvos: vi.fn(),
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/servidor/sessao', () => ({ usuarioAtual: async () => m.usuario }));
vi.mock('@/lib/servidor/conta', () => ({
  planoDaConta: async () => ({ plano: m.plano, daConta: m.plano, doNavegador: 'gratis', falhou: m.falhou }),
}));
vi.mock('@/lib/servidor/salvos', () => ({
  gravarSalvo: m.gravarSalvo, mudarObservacao: m.mudarObservacao, removerSalvo: m.removerSalvo, estadoDosSalvos: m.estadoDosSalvos,
}));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, ipHash: null }),
  gravarEvento: m.gravarEvento,
}));

const { DELETE, GET, PATCH, POST } = await import('./route');
const ID = '00394452000103-1-021982/2026';
type Metodo = typeof POST;
const pedir = (f: Metodo, metodo: string, corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  f(new Request('http://localhost/api/salvos', {
    method: metodo,
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...cabecalhos },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario = { id: 'u-sessao', email: 'dono@empresa.com.br' };
  m.plano = 'pro';
  m.falhou = false;
  m.gravarSalvo.mockResolvedValue('ok');
  m.mudarObservacao.mockResolvedValue(true);
  m.removerSalvo.mockResolvedValue(true);
  m.estadoDosSalvos.mockResolvedValue({ [ID]: { status: 'salvo', nota: false }, b: { status: 'descartado', nota: false } });
});

describe('GET /api/salvos', () => {
  it('sem sessão: { conta: false }, sem cache', async () => {
    m.usuario = null;
    const r = await GET();
    expect(await r.json()).toEqual({ conta: false });
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
  it('com sessão: plano, limite, usados (sem descartados) e o mapa', async () => {
    const r = await GET();
    expect(await r.json()).toEqual({ conta: true, plano: 'pro', limite: 500, usados: 1, salvos: { [ID]: { status: 'salvo', nota: false }, b: { status: 'descartado', nota: false } } });
  });
  it('plano da conta não confirmado (banco fora): 503 pedindo para tentar de novo', async () => {
    m.plano = 'gratis';
    m.falhou = true;
    const r = await GET();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.planoIndisponivel });
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe('POST /api/salvos', () => {
  it('outro site ou sem JSON: 403', async () => {
    for (const cab of [{ 'sec-fetch-site': 'cross-site' }, { 'content-type': 'text/plain' }] as Record<string, string>[]) expect((await pedir(POST, 'POST', { id: ID }, cab)).status).toBe(403);
    expect(m.gravarSalvo).not.toHaveBeenCalled();
  });
  it('sem sessão: 401 com codigo entrar', async () => {
    m.usuario = null;
    const r = await pedir(POST, 'POST', { id: ID });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' });
  });
  it('grátis: 402 com o convite aos planos, sem gravar', async () => {
    m.plano = 'gratis';
    const r = await pedir(POST, 'POST', { id: ID });
    expect(r.status).toBe(402);
    expect(await r.json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.salvosPlano, codigo: 'plano' });
    expect(m.gravarSalvo).not.toHaveBeenCalled();
  });
  it('plano não confirmado (banco fora): 503 "tente de novo", não o convite; sem gravar', async () => {
    m.plano = 'gratis';
    m.falhou = true;
    const r = await pedir(POST, 'POST', { id: ID });
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.planoIndisponivel });
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(m.gravarSalvo).not.toHaveBeenCalled();
  });
  it('falha na conta mas Pro pelo navegador: grava normalmente', async () => {
    m.falhou = true;
    expect((await pedir(POST, 'POST', { id: ID })).status).toBe(200);
    expect(m.gravarSalvo).toHaveBeenCalled();
  });
  it('Pro: grava no usuário da sessão com o limite 500 e conta edital_salvo; user_id do corpo é ignorado', async () => {
    const r = await pedir(POST, 'POST', { id: ID, user_id: 'outra-conta' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, status: 'salvo' });
    const [usuario, id, status, limite] = m.gravarSalvo.mock.calls[0] as [{ id: string }, string, string, number];
    expect([usuario.id, id, status, limite]).toEqual(['u-sessao', ID, 'salvo', 500]);
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'edital_salvo', { plano: 'pro' });
  });
  it('descartar: edital_descartado', async () => {
    await pedir(POST, 'POST', { id: ID, status: 'descartado' });
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'edital_descartado', { plano: 'pro' });
  });
  it('no limite: 402 limite; descartados cheios: mensagem própria; edital inexistente: 404', async () => {
    m.gravarSalvo.mockResolvedValue('limite');
    const r = await pedir(POST, 'POST', { id: ID });
    expect(r.status).toBe(402);
    expect(await r.json()).toEqual({ erro: 'Você chegou a 500 editais salvos. Remova um para salvar outro.', codigo: 'limite' });
    expect(await (await pedir(POST, 'POST', { id: ID, status: 'descartado' })).json()).toEqual({ erro: MENSAGENS_SALVOS.descartadosCheio, codigo: 'limite' });
    m.gravarSalvo.mockResolvedValue('sem_edital');
    expect((await pedir(POST, 'POST', { id: ID })).status).toBe(404);
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('corpo inválido 400; banco fora 502', async () => {
    expect((await pedir(POST, 'POST', { id: 'x' })).status).toBe(400);
    expect((await pedir(POST, 'POST', '{x')).status).toBe(400);
    m.gravarSalvo.mockRejectedValue(new Error('fora'));
    expect((await pedir(POST, 'POST', { id: ID })).status).toBe(502);
  });
});

describe('PATCH /api/salvos', () => {
  it('observação: grava aparada na conta da sessão', async () => {
    const r = await pedir(PATCH, 'PATCH', { id: ID, observacao: '  ligar  ' });
    expect(r.status).toBe(200);
    const [usuario, id, obs] = m.mudarObservacao.mock.calls[0] as [{ id: string }, string, string];
    expect([usuario.id, id, obs]).toEqual(['u-sessao', ID, 'ligar']);
    expect(m.gravarSalvo).not.toHaveBeenCalled();
  });
  it('status: gravar_salvo com o limite; só descartar conta evento', async () => {
    await pedir(PATCH, 'PATCH', { id: ID, status: 'analise' });
    expect(m.gravarSalvo).toHaveBeenCalledWith(expect.anything(), ID, 'analise', 500);
    expect(m.gravarEvento).not.toHaveBeenCalled();
    await pedir(PATCH, 'PATCH', { id: ID, status: 'descartado' });
    expect(m.gravarEvento).toHaveBeenCalledWith(expect.anything(), 'edital_descartado', { plano: 'pro' });
  });
  it('não salvo: 404; sem sessão 401; outro site 403', async () => {
    m.mudarObservacao.mockResolvedValue(false);
    expect((await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' })).status).toBe(404);
    m.usuario = null;
    expect((await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' })).status).toBe(401);
    expect((await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
  });
  it('grátis: 402 com o convite aos planos (status, observação ou descartar), sem gravar', async () => {
    m.plano = 'gratis';
    for (const corpo of [{ id: ID, observacao: 'x' }, { id: ID, status: 'analise' }, { id: ID, status: 'descartado' }]) {
      const r = await pedir(PATCH, 'PATCH', corpo);
      expect(r.status).toBe(402);
      expect(await r.json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.salvosPlano, codigo: 'plano' });
    }
    expect(m.gravarSalvo).not.toHaveBeenCalled();
    expect(m.mudarObservacao).not.toHaveBeenCalled();
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('plano não confirmado (banco fora): 503 "tente de novo", sem gravar', async () => {
    m.plano = 'gratis';
    m.falhou = true;
    const r = await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' });
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: MENSAGENS_LIMITE_CONTA.planoIndisponivel });
    expect(m.mudarObservacao).not.toHaveBeenCalled();
  });
  it('corpo inválido 400; banco fora 502', async () => {
    expect((await pedir(PATCH, 'PATCH', { id: ID })).status).toBe(400);
    m.mudarObservacao.mockRejectedValue(new Error('fora'));
    expect((await pedir(PATCH, 'PATCH', { id: ID, observacao: 'x' })).status).toBe(502);
  });
});

describe('DELETE /api/salvos', () => {
  it('remove da conta da sessão; não salvo 404', async () => {
    expect((await pedir(DELETE, 'DELETE', { id: ID })).status).toBe(200);
    expect((m.removerSalvo.mock.calls[0] as [{ id: string }, string])[0].id).toBe('u-sessao');
    m.removerSalvo.mockResolvedValue(false);
    expect((await pedir(DELETE, 'DELETE', { id: ID })).status).toBe(404);
  });
  it('outro site 403; sem sessão 401; corpo inválido 400; todas sem cache', async () => {
    const fora = await pedir(DELETE, 'DELETE', { id: ID }, { 'sec-fetch-site': 'cross-site' });
    expect(fora.status).toBe(403);
    expect(m.removerSalvo).not.toHaveBeenCalled();
    expect((await pedir(DELETE, 'DELETE', {})).status).toBe(400);
    m.usuario = null;
    const r = await pedir(DELETE, 'DELETE', { id: ID });
    expect(r.status).toBe(401);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
});
