import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const faixas: Array<[number, number]> = [];
let total = 0;
// Chamadas de rpc registradas: o contrato TS↔SQL é o nome da função e as chaves dos argumentos.
const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
let respostaRpc: unknown = [];

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    // Serve os três jeitos de consumir uma rpc: direto (await), `.range()` (mapa) e `.single()` (resumo).
    rpc: (nome: string, args: Record<string, unknown>) => {
      chamadas.push({ nome, args });
      const resposta = Promise.resolve({ data: respostaRpc, error: null });
      return {
        range: () => resposta,
        single: () => resposta,
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => resposta.then(ok, ko),
      };
    },
    from: () => {
      const consulta = {
        select: () => consulta,
        eq: () => consulta,
        order: () => consulta,
        // Devolve só as linhas que existem dentro da faixa pedida, como o PostgREST.
        range: (de: number, ate: number) => {
          faixas.push([de, ate]);
          const quantas = Math.max(0, Math.min(ate + 1, total) - de);
          const data = Array.from({ length: quantas }, (_, i) => ({
            numero: de + i + 1,
            descricao: `Item ${de + i + 1}`,
            quantidade: 1,
            unidade: 'UN',
            valor_unitario_estimado: 1,
            valor_total_estimado: 1,
            sigiloso: false,
          }));
          return Promise.resolve({ data, error: null, count: total });
        },
      };
      return consulta;
    },
  }),
}));

const { buscarEditais, itensDoEdital, pontosDoMapa, resumoItens } = await import('./consultas');

describe('itensDoEdital', () => {
  beforeEach(() => {
    faixas.length = 0;
  });

  it('lê uma página só quando o edital cabe nela', async () => {
    total = 50;
    const r = await itensDoEdital('a', 2000);
    expect(r.total).toBe(50);
    expect(r.itens).toHaveLength(50);
    expect(faixas).toEqual([[0, 999]]);
  });

  it('não pede faixa além do fim quando o edital tem exatamente 1.000 itens', async () => {
    total = 1000;
    const r = await itensDoEdital('b', 2000);
    expect(r.itens).toHaveLength(1000);
    expect(faixas).toEqual([[0, 999]]);
  });

  it('não pede faixa além do fim quando o edital tem exatamente 2.000 itens', async () => {
    total = 2000;
    const r = await itensDoEdital('c', 2000);
    expect(r.itens).toHaveLength(2000);
    expect(faixas).toEqual([[0, 999], [1000, 1999]]);
  });

  it('lê em duas páginas e para no fim quando o edital tem 1.536 itens', async () => {
    total = 1536;
    const r = await itensDoEdital('d', 2000);
    expect(r.total).toBe(1536);
    expect(r.itens).toHaveLength(1536);
    expect(faixas).toEqual([[0, 999], [1000, 1999]]);
  });

  it('respeita o limite pedido e informa o total do edital', async () => {
    total = 5002;
    const r = await itensDoEdital('e', 50);
    expect(r.total).toBe(5002);
    expect(r.itens).toHaveLength(50);
    expect(faixas).toEqual([[0, 49]]);
  });

  it('limita a 2.000 itens quando o edital tem mais', async () => {
    total = 5002;
    const r = await itensDoEdital('f', 2000);
    expect(r.total).toBe(5002);
    expect(r.itens).toHaveLength(2000);
    expect(faixas).toEqual([[0, 999], [1000, 1999]]);
  });
});

describe('contrato com as funções SQL (0004)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  const chaves = (args: Record<string, unknown>) => Object.keys(args).sort();

  it('buscarEditais chama buscar_editais com os argumentos da 0004', async () => {
    await buscarEditais({ q: 'luva', uf: 'SC', ibge: '4209102', dias: 7, deslocamento: 50, valorMin: 1000, modalidades: [6, 8] });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(
      ['q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento'].sort(),
    );
    expect(chamadas[0].args).toMatchObject({ q: 'luva', p_ufs: ['SC'], p_valor_min: 1000, p_modalidades: [6, 8], p_limite: 50, p_deslocamento: 50 });
  });

  it('buscarEditais manda todas as chaves também sem filtros', async () => {
    await buscarEditais({ q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null });
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(
      ['q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento'].sort(),
    );
    expect(chamadas[0].args).toMatchObject({ q: null, p_ufs: null, p_valor_min: null, p_modalidades: null });
  });

  it('pontosDoMapa chama mapa_editais com os argumentos da 0004', async () => {
    await pontosDoMapa({ q: 'bota', uf: 'PR', ibge: null, dias: 7, deslocamento: 0, valorMin: 5000, modalidades: [4] });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('mapa_editais');
    expect(chaves(chamadas[0].args)).toEqual(['q', 'p_ufs', 'p_dias', 'p_valor_min', 'p_modalidades'].sort());
    expect(chamadas[0].args).toMatchObject({ q: 'bota', p_ufs: ['PR'], p_valor_min: 5000, p_modalidades: [4] });
  });

  it('resumoItens chama resumo_itens e mapeia as colunas para ResumoItens', async () => {
    respostaRpc = { total: 12, materiais: 10, servicos: 2, com_beneficio: 9, exclusivos: 6, cota: 3, criterios: ['Menor preço'] };
    const r = await resumoItens('contratacao-1');
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('resumo_itens');
    expect(chaves(chamadas[0].args)).toEqual(['p_contratacao']);
    expect(chamadas[0].args.p_contratacao).toBe('contratacao-1');
    expect(r).toEqual({ total: 12, materiais: 10, servicos: 2, comBeneficio: 9, exclusivos: 6, cota: 3, criterios: ['Menor preço'] });
  });
});
