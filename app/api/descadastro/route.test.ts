import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarTokenDescadastro } from '@/lib/alertas/token';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ aplicar: vi.fn(async (..._a: unknown[]) => 1) }));
vi.mock('@/lib/servidor/descadastro', () => ({ aplicarDescadastro: m.aplicar }));

const SEGREDO = 's'.repeat(40);
process.env.ALERTAS_SEGREDO = SEGREDO;
const { POST } = await import('./route');
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
  it('sem ALERTAS_SEGREDO (ou curto): 400, nada é aplicado', async () => {
    const t = criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, SEGREDO);
    for (const v of [undefined, 'curto']) {
      if (v === undefined) delete process.env.ALERTAS_SEGREDO;
      else process.env.ALERTAS_SEGREDO = v;
      expect((await post(`?t=${t}`)).status).toBe(400);
    }
    expect(m.aplicar).not.toHaveBeenCalled();
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
