import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  criarCobranca: vi.fn(),
  criarCheckout: vi.fn(),
  dentro: vi.fn(),
  gravarEvento: vi.fn(async () => undefined),
  env: {} as Record<string, string | undefined>,
}));

vi.mock('@/lib/servidor/caktoApi', async () => {
  const real = await vi.importActual<typeof import('@/lib/servidor/caktoApi')>('@/lib/servidor/caktoApi');
  return { ErroCakto: real.ErroCakto, criarCobranca: m.criarCobranca };
});
vi.mock('server-only', () => ({}));
vi.mock('@/lib/servidor/pagamento', () => ({ criarCheckout: m.criarCheckout }));
vi.mock('@/lib/servidor/registro', () => ({
  contexto: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: 'ip' }),
  gravarEvento: m.gravarEvento,
  recursoDentroDoLimite: m.dentro,
}));

const { ErroCakto } = await import('@/lib/servidor/caktoApi');
const { POST } = await import('./route');

const ENV = {
  CAKTO_WEBHOOK_SECRET: 's', CAKTO_CLIENT_ID: 'id', CAKTO_CLIENT_SECRET: 'sec', CAKTO_OFERTA_PRO_MENSAL: 'irpv92e', CAKTO_OFERTA_PRO_ANUAL: 'iuy9gzb',
};
const COMPRADOR = { nome: 'Maria da Silva', email: 'maria@exemplo.com', celular: '11999998888', documento: '52998224725' };
const CODIGO = 'c'.repeat(32);

const pedido = (corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  new Request('http://localhost/api/assinar', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...cabecalhos },
    body: JSON.stringify(corpo),
  });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(process.env, ENV);
  m.dentro.mockResolvedValue(true);
  m.criarCheckout.mockResolvedValue(CODIGO);
});

describe('POST /api/assinar', () => {
  it('Pix Automático: cria a cobrança com a oferta do período e devolve o QR', async () => {
    m.criarCobranca.mockResolvedValue({ id: 'p1', status: 'waiting_payment', pix: { qrCode: '000201abc', expirationDate: '2026-10-18 15:10:00+00:00' } });
    const r = await POST(pedido({ periodo: 'anual', metodo: 'pix', comprador: COMPRADOR }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ codigo: CODIGO, estado: 'aguardando', qrCode: '000201abc', expiraEm: '2026-10-18T15:10:00.000Z' });
    const [, corpo, idem] = m.criarCobranca.mock.calls[0];
    expect(corpo).toMatchObject({ paymentMethod: 'pix_auto', items: [{ offerId: 'iuy9gzb' }], metadata: { sck: CODIGO } });
    expect(corpo.customer.fingerprint).toBe('6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b');
    expect(idem).toBe(`${CODIGO}-pix`);
    expect(m.criarCheckout).toHaveBeenCalledWith(expect.anything(), 'pro', 'anual');
  });
  it('cartão aprovado e cartão recusado', async () => {
    const cartao = { token: 'tok', threeDSecure: { cavv: 'c' }, antifraude: 'af' };
    m.criarCobranca.mockResolvedValueOnce({ id: 'c1', status: 'paid' }).mockResolvedValueOnce({ id: 'c2', status: 'declined' });
    expect(await (await POST(pedido({ metodo: 'cartao', comprador: COMPRADOR, cartao }))).json()).toMatchObject({ estado: 'pago' });
    const recusado = await (await POST(pedido({ metodo: 'cartao', comprador: COMPRADOR, cartao }))).json();
    expect(recusado).toMatchObject({ estado: 'recusado' });
    expect(recusado.erro).toContain('recusou');
    expect(m.criarCobranca.mock.calls[0][1]).toMatchObject({ paymentMethod: 'threeDs', card: { token: 'tok' }, items: [{ offerId: 'irpv92e' }] });
  });
  it('dados inválidos: 400 com os campos, sem criar nada', async () => {
    const r = await POST(pedido({ metodo: 'pix', comprador: { ...COMPRADOR, documento: '123' } }));
    expect(r.status).toBe(400);
    expect((await r.json()).erros).toEqual({ documento: 'Informe um CPF ou CNPJ válido.' });
    expect(m.criarCheckout).not.toHaveBeenCalled();
  });
  it('cartão sem token: 400', async () => {
    expect((await POST(pedido({ metodo: 'cartao', comprador: COMPRADOR, cartao: { numero: '4111' } }))).status).toBe(400);
  });
  it('de outro site: 403; muitas tentativas: 429; pagamento desligado: 503', async () => {
    expect((await POST(pedido({}, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    m.dentro.mockResolvedValue(false);
    expect((await POST(pedido({ metodo: 'pix', comprador: COMPRADOR }))).status).toBe(429);
    delete process.env.CAKTO_OFERTA_PRO_ANUAL;
    expect((await POST(pedido({ metodo: 'pix', comprador: COMPRADOR }))).status).toBe(503);
  });
  it('erro da Cakto: mensagem genérica (sem dados do comprador)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.criarCobranca.mockRejectedValue(new ErroCakto(400, '{"customer":{"phone":["inválido"]}}'));
    const r = await POST(pedido({ metodo: 'pix', comprador: COMPRADOR }));
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toContain('Não conseguimos criar a cobrança');
    expect(JSON.stringify(log.mock.calls)).not.toContain('maria@exemplo.com');
    log.mockRestore();
  });
});
