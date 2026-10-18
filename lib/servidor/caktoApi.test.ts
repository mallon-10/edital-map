import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { ErroCakto, criarCobranca, limparTokenCakto } = await import('./caktoApi');

const CRED = { clienteId: 'id', clienteSegredo: 'sec' };
const chamadas: Array<{ url: string; init: RequestInit }> = [];

function responder(...respostas: Array<{ status: number; corpo: unknown }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      chamadas.push({ url, init });
      const r = respostas.shift() ?? { status: 500, corpo: {} };
      return new Response(JSON.stringify(r.corpo), { status: r.status });
    }),
  );
}

beforeEach(() => {
  chamadas.length = 0;
  limparTokenCakto();
});
afterEach(() => vi.unstubAllGlobals());

describe('criarCobranca', () => {
  it('pede o token com as credenciais e cria a cobrança com a idempotência', async () => {
    responder({ status: 200, corpo: { access_token: 'tk', expires_in: 36000 } }, { status: 201, corpo: { id: 'p1', status: 'waiting_payment' } });
    expect(await criarCobranca(CRED, { paymentMethod: 'pix_auto' }, 'chave-1')).toEqual({ id: 'p1', status: 'waiting_payment' });
    expect(chamadas[0].url).toBe('https://api.cakto.com.br/public_api/token/');
    expect(String(chamadas[0].init.body)).toBe('client_id=id&client_secret=sec');
    expect(chamadas[1].url).toBe('https://api.cakto.com.br/public_api/payments/');
    expect(chamadas[1].init.headers).toMatchObject({ Authorization: 'Bearer tk', 'X-Idempotency-Key': 'chave-1' });
  });
  it('reaproveita o token enquanto vale', async () => {
    responder(
      { status: 200, corpo: { access_token: 'tk', expires_in: 36000 } },
      { status: 201, corpo: { id: 'p1' } },
      { status: 201, corpo: { id: 'p2' } },
    );
    await criarCobranca(CRED, {}, 'a');
    await criarCobranca(CRED, {}, 'b');
    expect(chamadas.filter((c) => c.url.endsWith('/token/'))).toHaveLength(1);
  });
  it('token recusado (401): pede outro uma vez e tenta de novo', async () => {
    responder(
      { status: 200, corpo: { access_token: 'velho', expires_in: 36000 } },
      { status: 401, corpo: { detail: 'expirado' } },
      { status: 200, corpo: { access_token: 'novo', expires_in: 36000 } },
      { status: 201, corpo: { id: 'p1' } },
    );
    expect(await criarCobranca(CRED, {}, 'a')).toEqual({ id: 'p1' });
    expect(chamadas[3].init.headers).toMatchObject({ Authorization: 'Bearer novo' });
  });
  it('400 da Cakto vira ErroCakto com o corpo (para o log) e o status', async () => {
    responder({ status: 200, corpo: { access_token: 'tk', expires_in: 36000 } }, { status: 400, corpo: { customer: { email: ['inválido'] } } });
    const erro = await criarCobranca(CRED, {}, 'a').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroCakto);
    expect(erro).toMatchObject({ status: 400 });
    expect((erro as Error).message).toContain('customer');
  });
});
