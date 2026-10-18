import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({ chamadas: [] as unknown[][], dados: [] as unknown }));
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: unknown) => {
      m.chamadas.push(['rpc', nome, args]);
      return Promise.resolve({ data: m.dados, error: null });
    },
  }),
}));

const { buscarMunicipios } = await import('./municipios');

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
