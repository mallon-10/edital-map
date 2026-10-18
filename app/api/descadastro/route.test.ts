import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarTokenDescadastro } from '@/lib/alertas/token';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ aplicar: vi.fn(async (..._a: unknown[]) => 1) }));
vi.mock('@/lib/servidor/descadastro', () => ({ aplicarDescadastro: m.aplicar }));

const SEGREDO = 's'.repeat(40);
process.env.ALERTAS_SEGREDO = SEGREDO;
const { GET, POST } = await import('./route');
const ALERTA = '11111111-1111-4111-8111-111111111111';
const CONTA = '22222222-2222-4222-8222-222222222222';
const post = (q: string, init: RequestInit = {}) => POST(new Request(`http://localhost/api/descadastro${q}`, { method: 'POST', ...init }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  process.env.ALERTAS_SEGREDO = SEGREDO;
  vi.restoreAllMocks();
});

describe('POST /api/descadastro', () => {
  it('um clique do provedor (form, de fora do site): token válido pausa', async () => {
    const t = criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, SEGREDO);
    const r = await post(`?t=${encodeURIComponent(t)}`, {
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'sec-fetch-site': 'cross-site', origin: 'https://mail.google.com' },
      body: 'List-Unsubscribe=One-Click',
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, pausados: 1 });
    expect(m.aplicar).toHaveBeenCalledWith({ tipo: 'alerta', id: ALERTA });
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
  it('corpo vazio (botão da página ou provedor sem corpo) também vale', async () => {
    const t = criarTokenDescadastro({ tipo: 'todos', conta: CONTA }, SEGREDO);
    const r = await post(`?t=${t}`);
    expect(r.status).toBe(200);
    expect(m.aplicar).toHaveBeenCalledWith({ tipo: 'todos', conta: CONTA });
  });
  it('token inválido, adulterado ou ausente: 400 sem mexer em nada', async () => {
    const bom = criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, SEGREDO);
    for (const q of [
      '', '?t=x', `?t=${encodeURIComponent(criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, 'o'.repeat(40)))}`,
      `?t=${bom.replace(ALERTA, CONTA)}`, `?t=t${bom.slice(1)}`,
    ]) {
      const r = await post(q);
      expect(r.status, q).toBe(400);
      expect(r.headers.get('cache-control')).toBe('private, no-store');
      expect(JSON.stringify(await r.json())).not.toContain(ALERTA);
    }
    expect(m.aplicar).not.toHaveBeenCalled();
  });
  it('sem ALERTAS_SEGREDO (ou curto): 400, nada é aplicado, e o log avisa sem o token', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, SEGREDO);
    for (const v of [undefined, 'curto']) {
      if (v === undefined) delete process.env.ALERTAS_SEGREDO;
      else process.env.ALERTAS_SEGREDO = v;
      expect((await post(`?t=${t}`)).status).toBe(400);
    }
    expect(m.aplicar).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('ALERTAS_SEGREDO ausente ou curto');
    expect(JSON.stringify(log.mock.calls)).not.toContain(ALERTA);
  });
  it('token ruim com segredo certo não gera log de segredo', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await post('?t=x')).status).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });
  it('banco fora: 502, e o log não leva o id', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    m.aplicar.mockRejectedValueOnce(new Error('fora'));
    const t = criarTokenDescadastro({ tipo: 'resumo', conta: CONTA }, SEGREDO);
    const r = await post(`?t=${t}`);
    expect(r.status).toBe(502);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(JSON.stringify(log.mock.calls)).not.toContain(CONTA);
  });
});

describe('GET /api/descadastro (cliente sem RFC 8058 abre o link)', () => {
  it('nunca aplica: 303 para a confirmação no próprio site, com o mesmo token', async () => {
    const t = criarTokenDescadastro({ tipo: 'todos', conta: CONTA }, SEGREDO);
    for (const q of [`?t=${encodeURIComponent(t)}`, '?t=x', '', '?t=a%20b%26c%3Dd']) {
      const r = await GET(new Request(`http://localhost/api/descadastro${q}`));
      expect(r.status, q).toBe(303);
      expect(r.headers.get('cache-control')).toBe('private, no-store');
      const destino = new URL(r.headers.get('location') ?? '', 'https://www.editalmap.com.br');
      expect(destino.origin).toBe('https://www.editalmap.com.br');
      expect(destino.pathname).toBe('/alertas/sair');
      expect(destino.searchParams.get('t') ?? '').toBe(new URL(`http://localhost/${q}`).searchParams.get('t') ?? '');
    }
    expect(m.aplicar).not.toHaveBeenCalled();
  });
  it('o host do pedido não muda o destino', async () => {
    const r = await GET(new Request('https://malicioso.example/api/descadastro?t=x', { headers: { host: 'malicioso.example' } }));
    expect(new URL(r.headers.get('location') ?? '', 'https://www.editalmap.com.br').origin).toBe('https://www.editalmap.com.br');
  });
});
