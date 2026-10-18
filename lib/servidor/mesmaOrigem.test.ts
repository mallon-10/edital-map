import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { pedidoDoSite, recusaForaDoSite } = await import('./mesmaOrigem');

const pedido = (cabecalhos: Record<string, string>) =>
  new Request('https://edital-map.vercel.app/api/conta/entrar', { method: 'POST', headers: cabecalhos, body: '{}' });
const JSON_ = { 'content-type': 'application/json' };

describe('pedidoDoSite', () => {
  it('JSON do próprio site (Sec-Fetch-Site same-origin ou none) passa', () => {
    expect(pedidoDoSite(pedido({ ...JSON_, 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(pedidoDoSite(pedido({ 'content-type': 'application/json; charset=utf-8', 'sec-fetch-site': 'none' }))).toBe(true);
  });
  it('formulário (text/plain, x-www-form-urlencoded) ou sem content-type: recusado', () => {
    for (const ct of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
      expect(pedidoDoSite(pedido({ 'content-type': ct, 'sec-fetch-site': 'same-origin' }))).toBe(false);
    }
    expect(pedidoDoSite(pedido({ 'sec-fetch-site': 'same-origin' }))).toBe(false);
  });
  it('outro site (cross-site ou same-site): recusado', () => {
    expect(pedidoDoSite(pedido({ ...JSON_, 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(pedidoDoSite(pedido({ ...JSON_, 'sec-fetch-site': 'same-site' }))).toBe(false);
  });
  it('sem Sec-Fetch-Site: vale o Origin igual ao host', () => {
    expect(pedidoDoSite(pedido({ ...JSON_, origin: 'https://edital-map.vercel.app' }))).toBe(true);
    expect(pedidoDoSite(pedido({ ...JSON_, origin: 'https://mal.com' }))).toBe(false);
    expect(pedidoDoSite(pedido({ ...JSON_, origin: 'null' }))).toBe(false);
    expect(pedidoDoSite(pedido(JSON_))).toBe(false);
  });
  it('recusaForaDoSite: 403 sem cache, ou null quando passa', async () => {
    const r = recusaForaDoSite(pedido({ 'content-type': 'text/plain' }));
    expect(r?.status).toBe(403);
    expect(r?.headers.get('cache-control')).toBe('private, no-store');
    expect(recusaForaDoSite(pedido({ ...JSON_, 'sec-fetch-site': 'same-origin' }))).toBeNull();
  });
});
