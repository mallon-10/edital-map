import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], dados: [] as unknown }));
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: unknown) => {
      m.chamadas.push(['rpc', nome, args]);
      return Promise.resolve({ data: m.dados, error: null });
    },
    from: (t: string) => ({
      select: (colunas: string) => ({
        in: (coluna: string, valores: unknown) => {
          m.chamadas.push(['in', t, colunas, coluna, valores]);
          return Promise.resolve({ data: m.dados, error: null });
        },
      }),
    }),
  }),
}));

const { buscarMunicipios, municipiosPorIbge } = await import('./municipios');

beforeEach(() => {
  m.chamadas.length = 0;
});

describe('buscarMunicipios (buscar_municipios, 0014)', () => {
  it('chama buscar_municipios com o texto limpo e até 10', async () => {
    m.dados = [{ codigo_ibge: '4209102', nome: 'Joinville', uf: 'SC' }];
    expect(await buscarMunicipios('  Joinv  ')).toEqual([{ ibge: '4209102', nome: 'Joinville', uf: 'SC' }]);
    expect(m.chamadas[0]).toEqual(['rpc', 'buscar_municipios', { q: 'Joinv', p_limite: 10 }]);
  });
  it('curingas do ilike (% _ \\), texto curto ou longo: lista vazia sem consultar', async () => {
    for (const q of ['%', 'a%', 'jo_nville', 'são\\', 'a', 'x'.repeat(61), '']) expect(await buscarMunicipios(q)).toEqual([]);
    expect(m.chamadas).toHaveLength(0);
  });
});

describe('municipiosPorIbge (nome e UF dos municípios do radar)', () => {
  it('na ordem pedida; código que não existe some', async () => {
    m.dados = [{ codigo_ibge: '4205407', nome: 'Florianópolis', uf: 'SC' }, { codigo_ibge: '4209102', nome: 'Joinville', uf: 'SC' }];
    expect((await municipiosPorIbge(['4209102', '9999999', '4205407'])).map((c) => c.nome)).toEqual(['Joinville', 'Florianópolis']);
    expect(m.chamadas[0]).toEqual(['in', 'municipios', 'codigo_ibge, nome, uf', 'codigo_ibge', ['4209102', '9999999', '4205407']]);
  });
  it('lista vazia não consulta', async () => {
    expect(await municipiosPorIbge([])).toEqual([]);
    expect(m.chamadas).toHaveLength(0);
  });
});
