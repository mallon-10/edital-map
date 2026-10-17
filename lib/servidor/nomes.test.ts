import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nomeProprio } from '../texto';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: { message: string } | null };
type Consulta = {
  select: (colunas: string) => Consulta;
  eq: (coluna: string, valor: unknown) => Consulta;
  limit: (n: number) => Consulta;
  maybeSingle: () => Promise<Resposta>;
};

const m = vi.hoisted(() => ({
  consultas: [] as Array<{ tabela: string; colunas: string; filtro: [string, unknown] | null }>,
  resposta: { data: null, error: null } as { data: unknown; error: { message: string } | null },
}));

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    from: (tabela: string) => {
      const registro = { tabela, colunas: '', filtro: null as [string, unknown] | null };
      m.consultas.push(registro);
      const c: Consulta = {
        select: (colunas) => {
          registro.colunas = colunas;
          return c;
        },
        eq: (coluna, valor) => {
          registro.filtro = [coluna, valor];
          return c;
        },
        limit: () => c,
        maybeSingle: () => Promise.resolve(m.resposta),
      };
      return c;
    },
  }),
}));

const { municipioPorIbge, orgaoPorCnpj } = await import('./nomes');

beforeEach(() => {
  m.consultas.length = 0;
  m.resposta = { data: null, error: null };
});

describe('nomes dos filtros vindos do endereço', () => {
  it('município pelo código IBGE', async () => {
    m.resposta = { data: { codigo_ibge: '4209102', nome: 'Joinville', uf: 'SC' }, error: null };
    expect(await municipioPorIbge('4209102')).toEqual({ ibge: '4209102', nome: 'Joinville', uf: 'SC' });
    expect(m.consultas).toEqual([{ tabela: 'municipios', colunas: 'codigo_ibge, nome, uf', filtro: ['codigo_ibge', '4209102'] }]);
  });
  it('município que não existe: null', async () => {
    expect(await municipioPorIbge('9999999')).toBeNull();
  });
  it('órgão pelo CNPJ, com o nome limpo', async () => {
    m.resposta = { data: { orgao_nome: 'MUNICIPIO DE JOINVILLE' }, error: null };
    expect(await orgaoPorCnpj('83102285000107')).toEqual({ cnpj: '83102285000107', nome: nomeProprio('MUNICIPIO DE JOINVILLE') });
    expect(m.consultas[0]).toEqual({ tabela: 'contratacoes', colunas: 'orgao_nome', filtro: ['cnpj', '83102285000107'] });
  });
  it('órgão sem contratação no espelho: o nome é o CNPJ', async () => {
    expect(await orgaoPorCnpj('11222333000181')).toEqual({ cnpj: '11222333000181', nome: '11222333000181' });
  });
  it('erro do banco sobe (a página tira o filtro)', async () => {
    m.resposta = { data: null, error: { message: 'timeout' } };
    await expect(municipioPorIbge('4205407')).rejects.toThrow('municipio: timeout');
  });
});
