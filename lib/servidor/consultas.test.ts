import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const faixas: Array<[number, number]> = [];
let total = 0;

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
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

const { itensDoEdital } = await import('./consultas');

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
