import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

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
  }),
}));

const { buscarEditais, itensDoEdital, pontosDoMapa, resumoItens } = await import('./consultas');

const compra = (id: string) => ({ id, cnpj: '00394452000103', ano: 2026, sequencial: 21982 });

describe('itensDoEdital (PNCP na hora)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('devolve os itens do PNCP mapeados para a lista do edital', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([{ numeroItem: 1, descricao: 'Luva nitrílica', materialOuServico: 'M' }]), { status: 200 })),
    );
    expect(await itensDoEdital(compra('ok-1'), 50)).toEqual([
      expect.objectContaining({ numero: 1, descricao: 'Luva nitrílica', material_ou_servico: 'M' }),
    ]);
  });

  it('PNCP fora do ar vira null (a página mostra "Itens indisponíveis agora")', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await itensDoEdital(compra('falha-1'), 50)).toBeNull();
  });

  it('falha não fica no cache: a próxima visita tenta de novo', async () => {
    const f = vi.fn(async () => Promise.reject(new TypeError('fetch failed')));
    vi.stubGlobal('fetch', f);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await itensDoEdital(compra('falha-2'), 50);
    await itensDoEdital(compra('falha-2'), 50);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('contrato com as funções SQL (0005)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  const chaves = (args: Record<string, unknown>) => Object.keys(args).sort();

  it('buscarEditais chama buscar_editais com os argumentos da 0005', async () => {
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
