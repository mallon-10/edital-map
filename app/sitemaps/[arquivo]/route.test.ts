import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  abertosPorUf: vi.fn(async (..._a: unknown[]): Promise<Record<string, number>> => ({ SC: 3 })),
  abertosPorModalidade: vi.fn(async (): Promise<Record<number, Record<string, number>>> => ({ 6: { SC: 2 } })),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/servidor/consultas', () => ({ abertosPorUf: m.abertosPorUf, abertosPorModalidade: m.abertosPorModalidade, editaisAbertosSitemap: async () => [] }));
vi.mock('@/lib/servidor/licitacoes', () => ({ cidadesComPagina: async () => [], orgaosComPagina: async () => [] }));

const { GET } = await import('./route');
const pedir = () => GET(new Request('https://x/sitemaps/paginas.xml'), { params: Promise.resolve({ arquivo: 'paginas.xml' }) });

beforeEach(() => {
  m.abertosPorUf.mockReset();
  m.abertosPorUf.mockImplementation(async () => ({ SC: 3 }));
  m.abertosPorModalidade.mockReset();
  m.abertosPorModalidade.mockImplementation(async () => ({ 6: { SC: 2 } }));
});

describe('sitemap das páginas', () => {
  it('completo: guarda na CDN e traz as páginas de estado', async () => {
    const r = await pedir();
    expect(r.headers.get('Cache-Control')).toContain('s-maxage=3600');
    expect(await r.text()).toContain('/licitacoes/sc<');
  });
  it('falha passageira na contagem por estado: repete e sai completo', async () => {
    m.abertosPorUf.mockImplementationOnce(async () => {
      throw new Error('tempo esgotado');
    });
    const r = await pedir();
    expect(r.headers.get('Cache-Control')).toContain('s-maxage=3600');
    expect(await r.text()).toContain('/licitacoes/sc<');
  });
  it('faltou contagem mesmo repetindo: serve o que tem, mas a CDN não guarda', async () => {
    m.abertosPorUf.mockImplementation(async (q: unknown) => {
      if (q === null) throw new Error('tempo esgotado');
      return { SC: 3 };
    });
    const r = await pedir();
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(r.status).toBe(200);
  });
  it('faltou a contagem das modalidades: também não guarda', async () => {
    m.abertosPorModalidade.mockImplementation(async () => {
      throw new Error('fora');
    });
    expect((await pedir()).headers.get('Cache-Control')).toBe('no-store');
  });
  it('nunca dispara mais de quatro contagens ao mesmo tempo', async () => {
    let agora = 0;
    let maior = 0;
    m.abertosPorUf.mockImplementation(async () => {
      agora += 1;
      maior = Math.max(maior, agora);
      await new Promise((ok) => setTimeout(ok, 1));
      agora -= 1;
      return { SC: 3 };
    });
    await pedir();
    expect(maior).toBeLessThanOrEqual(4);
  });
});
