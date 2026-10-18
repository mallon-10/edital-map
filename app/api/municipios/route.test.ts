import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ buscarMunicipios: vi.fn() }));
vi.mock('@/lib/servidor/municipios', () => ({ buscarMunicipios: m.buscarMunicipios }));
const { GET } = await import('./route');

beforeEach(() => {
  m.buscarMunicipios.mockReset();
  m.buscarMunicipios.mockResolvedValue([{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }]);
});

describe('/api/municipios', () => {
  it('busca com o texto limpo e cache público', async () => {
    const r = await GET(new Request('http://localhost/api/municipios?q=%20Joinv%20'));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toContain('s-maxage=300');
    expect(await r.json()).toEqual([{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }]);
    expect(m.buscarMunicipios).toHaveBeenCalledWith('Joinv');
  });
  it('texto curto ou estranho: lista vazia sem consultar', async () => {
    for (const q of ['a%25', 'a', 'jo_nv', '']) {
      const r = await GET(new Request(`http://localhost/api/municipios?q=${q}`));
      expect(await r.json()).toEqual([]);
    }
    expect((await (await GET(new Request('http://localhost/api/municipios'))).json())).toEqual([]);
    expect(m.buscarMunicipios).not.toHaveBeenCalled();
  });
  it('banco fora: 502 sem cache', async () => {
    m.buscarMunicipios.mockRejectedValue(new Error('fora'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await GET(new Request('http://localhost/api/municipios?q=joinv'));
    expect(r.status).toBe(502);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
});
