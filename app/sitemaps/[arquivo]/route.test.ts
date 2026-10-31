import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  abertosPorUf: vi.fn(async (..._a: unknown[]): Promise<Record<string, number>> => ({ SC: 3 })),
  abertosPorModalidade: vi.fn(async (): Promise<Record<number, Record<string, number>>> => ({ 6: { SC: 2 } })),
  listasDoSitemap: vi.fn(async () => ({ cidades: [], orgaos: [], completo: true })),
  ordem: [] as string[],
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/servidor/consultas', () => ({ abertosPorUf: m.abertosPorUf, abertosPorModalidade: m.abertosPorModalidade, editaisAbertosSitemap: async () => [] }));
vi.mock('@/lib/servidor/licitacoes', () => ({ listasDoSitemap: m.listasDoSitemap }));

const { GET } = await import('./route');
const pedir = () => GET(new Request('https://x/sitemaps/paginas.xml'), { params: Promise.resolve({ arquivo: 'paginas.xml' }) });

beforeEach(() => {
  m.abertosPorUf.mockReset();
  m.abertosPorUf.mockImplementation(async () => ({ SC: 3 }));
  m.abertosPorModalidade.mockReset();
  m.abertosPorModalidade.mockImplementation(async () => ({ 6: { SC: 2 } }));
  m.listasDoSitemap.mockReset();
  m.listasDoSitemap.mockImplementation(async () => ({ cidades: [], orgaos: [], completo: true }));
  m.ordem.length = 0;
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
  it('faltou a lista de órgãos ou de cidades: também não guarda', async () => {
    m.listasDoSitemap.mockImplementation(async () => ({ cidades: [], orgaos: [], completo: false }));
    const r = await pedir();
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(r.status).toBe(200);
  });
  it('as listas vêm depois das contagens, para não disputar o banco com elas', async () => {
    m.abertosPorUf.mockImplementation(async () => {
      m.ordem.push('contagem');
      return { SC: 3 };
    });
    m.listasDoSitemap.mockImplementation(async () => {
      m.ordem.push('listas');
      return { cidades: [], orgaos: [], completo: true };
    });
    await pedir();
    expect(m.ordem.at(-1)).toBe('listas');
    expect(m.ordem.filter((x) => x === 'listas')).toHaveLength(1);
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
