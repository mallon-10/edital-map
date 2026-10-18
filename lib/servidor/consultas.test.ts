import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lerFiltros, paraParametros } from '../filtros';
import type { FiltrosBusca, FiltrosTela } from '../tipos';

vi.mock('server-only', () => ({}));

// Chamadas de rpc registradas: o contrato TS↔SQL é o nome da função e as chaves dos argumentos.
const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
/** Dados devolvidos pela rpc; uma função recebe os argumentos (páginas da exportação). */
let respostaRpc: unknown = [];

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    // Serve os três jeitos de consumir uma rpc: direto (await), `.range()` (mapa) e `.single()` (resumo).
    rpc: (nome: string, args: Record<string, unknown>) => {
      chamadas.push({ nome, args });
      const dados = typeof respostaRpc === 'function' ? (respostaRpc as (a: Record<string, unknown>) => unknown)(args) : respostaRpc;
      const resposta = Promise.resolve({ data: dados, error: null });
      return {
        range: () => resposta,
        single: () => resposta,
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => resposta.then(ok, ko),
      };
    },
  }),
}));

const {
  abertosPorUf, buscarEditais, editaisAbertosSitemap, exportarEditais, itensDoEdital, orgaosAbertos, pontosDoMapa, relacionados,
  resumoItens, totalEditaisAbertos,
} = await import('./consultas');

const compra = (id: string) => ({ id, cnpj: '00394452000103', ano: 2026, sequencial: 21982 });
const SEM_FILTRO: FiltrosBusca = {
  q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: null, valorMin: null, modalidades: null, orgao: null, raio: null,
};
const chaves = (args: Record<string, unknown>) => Object.keys(args).sort();

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

describe('contrato com as funções SQL (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  const ARGS_BUSCA = [
    'q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento', 'p_orgao', 'p_raio_km',
    'p_termos', 'p_relacionados', 'p_excluir', 'p_ordem',
  ].sort();
  const ARGS_MAPA = [
    'q', 'p_ufs', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_orgao', 'p_ibge', 'p_raio_km', 'p_termos', 'p_relacionados', 'p_excluir',
  ].sort();

  it('buscarEditais chama buscar_editais com os argumentos da 0007', async () => {
    await buscarEditais({
      q: 'luva', uf: 'SC', ibge: '4209102', dias: 7, pagina: 3, ordem: null, valorMin: 1000, modalidades: [6, 8], orgao: '83102244000102', raio: 100,
    });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(ARGS_BUSCA);
    expect(chamadas[0].args).toMatchObject({
      q: 'luva', p_ufs: null, p_ibge: '4209102', p_valor_min: 1000, p_modalidades: [6, 8], p_limite: 20, p_deslocamento: 40,
      p_orgao: '83102244000102', p_raio_km: 100,
    });
  });

  it('buscarEditais manda todas as chaves também sem filtros', async () => {
    await buscarEditais(SEM_FILTRO);
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(ARGS_BUSCA);
    expect(chamadas[0].args).toMatchObject({
      q: null, p_ufs: null, p_valor_min: null, p_modalidades: null, p_orgao: null, p_raio_km: null,
      p_termos: [], p_relacionados: [], p_excluir: [], p_ordem: 'prazo',
    });
  });

  it('pontosDoMapa chama mapa_editais com os argumentos da 0007; a cidade sozinha não vai ao mapa', async () => {
    await pontosDoMapa({ ...SEM_FILTRO, q: 'bota', uf: 'PR', ibge: '4106902', dias: 7, valorMin: 5000, modalidades: [4], orgao: '76417005000186' });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('mapa_editais');
    expect(chaves(chamadas[0].args)).toEqual(ARGS_MAPA);
    expect(chamadas[0].args).toMatchObject({
      q: 'bota', p_ufs: ['PR'], p_valor_min: 5000, p_modalidades: [4], p_orgao: '76417005000186', p_ibge: null, p_raio_km: null,
    });
  });

  it('com raio, lista e mapa mandam p_ufs nulo (o raio atravessa a divisa)', async () => {
    await buscarEditais({ ...SEM_FILTRO, uf: 'SC', ibge: '4209102', raio: 100 });
    await pontosDoMapa({ ...SEM_FILTRO, uf: 'SC', ibge: '4209102', raio: 100 });
    expect(chamadas[0].args).toMatchObject({ p_ufs: null });
    expect(chamadas[1].args).toMatchObject({ p_ufs: null });
  });

  it('pontosDoMapa com raio manda a cidade e o raio', async () => {
    await pontosDoMapa({ ...SEM_FILTRO, ibge: '4209102', raio: 100 });
    expect(chamadas[0].args).toMatchObject({ p_ibge: '4209102', p_raio_km: 100 });
  });

  it('ida e volta: tela → parâmetros da URL → lerFiltros → rpc', async () => {
    const tela: FiltrosTela = {
      q: 'luva', uf: '', cidade: { ibge: '4209102', nome: 'Joinville', uf: 'SC' }, valorMin: null, modalidades: [], seteDias: false,
      orgao: { cnpj: '83102244000102', nome: 'Município de Joinville' }, raio: 100,
    };
    await buscarEditais(lerFiltros(paraParametros(tela)));
    await pontosDoMapa(lerFiltros(paraParametros(tela, { comCidade: false })));
    expect(chamadas.map((c) => c.nome)).toEqual(['buscar_editais', 'mapa_editais']);
    for (const c of chamadas) {
      expect(c.args).toMatchObject({ q: 'luva', p_ibge: '4209102', p_orgao: '83102244000102', p_raio_km: 100 });
    }
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

  it('buscarEditais mapeia as colunas da 0011 com a relevância e os destaques (link_origem fica de fora do card)', async () => {
    respostaRpc = [
      {
        id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
        municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: '1000.50',
        encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
        link_origem: 'https://compras.joinville.sc.gov.br/1', onde: 'itens', total: 1,
        situacao_id: 4, pontuacao: 35, termos_objeto: [], termos_itens: ['nitrilica'], frase: false,
      },
    ];
    const r = await buscarEditais({ ...SEM_FILTRO, q: 'nitrilica' });
    expect(r).toEqual({
      total: 1,
      editais: [
        {
          id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
          municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: 1000.5,
          encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
          onde: 'itens', situacao_id: 4,
          relevancia: { pontos: 35, nivel: 'Baixa', explicacao: 'Menciona nitrilica nos itens.' },
          destaques: [],
        },
      ],
    });
  });

  it('busca com termo: digitados, relacionados, excluídos e a ordem padrão (relevância) vão separados', async () => {
    await buscarEditais({ ...SEM_FILTRO, q: 'uniformes -escolar' });
    const a = chamadas[0].args;
    expect(a).toMatchObject({ q: 'uniformes', p_termos: ['uniformes'], p_excluir: ['escolar'], p_ordem: 'relevancia' });
    expect(a.p_relacionados).toContain('fardamento');
  });

  it('ordem pedida vai como veio; relevância sem termo vira prazo', async () => {
    await buscarEditais({ ...SEM_FILTRO, q: 'luva', ordem: 'maior_valor' });
    await buscarEditais({ ...SEM_FILTRO, ordem: 'relevancia' });
    expect(chamadas.map((c) => c.args.p_ordem)).toEqual(['maior_valor', 'prazo']);
  });

  it('pontuação do banco diferente da do site vai para o log (a ordem é do banco, o número é do site)', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    respostaRpc = [
      {
        id: 'C2', slug: '00394452000103-2026-2', objeto: 'Uniformes', orgao_nome: 'X', unidade_nome: null, municipio_nome: null, uf: 'SC',
        codigo_ibge: null, valor_estimado: null, encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null,
        modalidade_nome: null, srp: false, link_origem: null, onde: 'objeto', total: 1,
        situacao_id: 1, pontuacao: 10, termos_objeto: ['uniformes'], termos_itens: [], frase: true,
      },
    ];
    const r = await buscarEditais({ ...SEM_FILTRO, q: 'uniformes' });
    expect(r.editais[0].relevancia?.pontos).toBe(75);
    expect(r.editais[0].destaques).toEqual(['uniformes']);
    expect(aviso).toHaveBeenCalledOnce();
    aviso.mockRestore();
  });

  it('o mapa recebe os mesmos termos da lista', async () => {
    await pontosDoMapa({ ...SEM_FILTRO, q: 'uniformes -escolar' });
    expect(chamadas[0].nome).toBe('mapa_editais');
    expect(chamadas[0].args).toMatchObject({ q: 'uniformes', p_termos: ['uniformes'], p_excluir: ['escolar'] });
    expect(chamadas[0].args.p_relacionados).toContain('fardamento');
  });
});

describe('relacionados (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  it('chama relacionados com o id e o limite de 6 e mapeia as colunas do card', async () => {
    respostaRpc = [
      {
        id: 'R1', slug: '83102244000102-2026-77', objeto: 'Luvas de vaqueta', orgao_nome: 'MUNICIPIO DE JOINVILLE',
        municipio_nome: 'Joinville', uf: 'SC', valor_estimado: '2500.00', encerramento_em: '2026-10-30T13:00:00+00:00',
        publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: true,
      },
    ];
    expect(await relacionados('origem-1')).toEqual([
      {
        id: 'R1', slug: '83102244000102-2026-77', objeto: 'Luvas de vaqueta', orgao_nome: 'MUNICIPIO DE JOINVILLE',
        municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 2500, encerramento_em: '2026-10-30T13:00:00+00:00',
        publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: true,
      },
    ]);
    expect(chamadas).toEqual([{ nome: 'relacionados', args: { p_id: 'origem-1', p_limite: 6 } }]);
  });

  it('guarda no cache por 5 min: a segunda visita não consulta de novo', async () => {
    await relacionados('origem-2');
    await relacionados('origem-2');
    expect(chamadas).toHaveLength(1);
  });

  it('sem parecidos, lista vazia', async () => {
    expect(await relacionados('origem-3')).toEqual([]);
  });
});

describe('orgaosAbertos (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  it('chama orgaos_abertos com o termo e até 20, com nome limpo e quantidade numérica', async () => {
    respostaRpc = [{ cnpj: '83102244000102', nome: 'MUNICIPIO DE JOINVILLE', uf: 'SC', qtd: '42' }];
    expect(await orgaosAbertos('Joinville')).toEqual([{ cnpj: '83102244000102', nome: 'Municipio de Joinville', uf: 'SC', qtd: 42 }]);
    expect(chamadas).toEqual([{ nome: 'orgaos_abertos', args: { q: 'Joinville', p_limite: 20 } }]);
  });

  it('o cache ignora acento e maiúsculas do termo', async () => {
    await orgaosAbertos('São José');
    await orgaosAbertos('sao jose');
    expect(chamadas).toHaveLength(1);
  });
});

describe('exportarEditais (0007)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  const linha = (i: number) => ({
    id: `E${i}`, slug: `83102244000102-2026-${i}`, objeto: 'Luvas', orgao_nome: 'X', unidade_nome: null, municipio_nome: 'Joinville',
    uf: 'SC', codigo_ibge: '4209102', valor_estimado: null, encerramento_em: '2026-10-30T13:00:00+00:00', publicada_em: null,
    modalidade_nome: null, srp: false, link_origem: i === 0 ? 'https://compras.joinville.sc.gov.br/1' : null, onde: 'objeto', total: 2500,
  });

  it('lê em páginas de 1.000 até 2.000, desde o começo, com os mesmos filtros da busca', async () => {
    respostaRpc = (args: Record<string, unknown>) => Array.from({ length: 1000 }, (_, i) => linha(Number(args.p_deslocamento) + i));
    const r = await exportarEditais({ ...SEM_FILTRO, q: 'luva', pagina: 3, orgao: '83102244000102' });
    expect(r.editais).toHaveLength(2000);
    expect(r.total).toBe(2500);
    expect(chamadas.map((c) => [c.nome, c.args.p_limite, c.args.p_deslocamento])).toEqual([
      ['buscar_editais', 1000, 0],
      ['buscar_editais', 1000, 1000],
    ]);
    expect(chamadas[0].args).toMatchObject({ q: 'luva', p_orgao: '83102244000102', p_raio_km: null });
    expect(r.editais[0]).toMatchObject({ id: 'E0', slug: '83102244000102-2026-0', link_origem: 'https://compras.joinville.sc.gov.br/1' });
    expect(r.editais[1].link_origem).toBeNull();
  });

  it('para na primeira página incompleta', async () => {
    respostaRpc = [linha(0)];
    const r = await exportarEditais(SEM_FILTRO);
    expect(r.editais).toHaveLength(1);
    expect(r.total).toBe(2500);
    expect(chamadas).toHaveLength(1);
  });
});

describe('SEO (0012)', () => {
  beforeEach(() => {
    chamadas.length = 0;
  });

  it('abertosPorUf manda os termos do assunto e devolve UF → total', async () => {
    respostaRpc = [{ uf: 'SP', total: 12 }, { uf: 'BA', total: 3 }];
    expect(await abertosPorUf('EPI')).toEqual({ SP: 12, BA: 3 });
    const c = chamadas.at(-1)!;
    expect(c.nome).toBe('abertos_por_uf');
    expect(chaves(c.args)).toEqual(['p_excluir', 'p_relacionados', 'p_termos']);
    expect(c.args.p_termos).toEqual(['EPI']);
    expect((c.args.p_relacionados as string[]).length).toBeGreaterThan(0);
  });

  it('abertosPorUf sem assunto conta todos', async () => {
    respostaRpc = [{ uf: 'SP', total: 900 }];
    await abertosPorUf(null);
    expect(chamadas.at(-1)!.args).toEqual({ p_termos: [], p_relacionados: [], p_excluir: [] });
  });

  it('sitemap lê em páginas de 1.000 (teto do PostgREST) a partir do deslocamento, até o limite', async () => {
    respostaRpc = (a: Record<string, unknown>) => {
      const de = Number(a.p_deslocamento);
      // 2.500 abertos a partir de 40.000: duas páginas cheias e uma de 500.
      const n = Math.max(0, Math.min(Number(a.p_limite), 42500 - de));
      return Array.from({ length: n }, (_, i) => ({ slug: `s-${de + i}`, atualizada_pncp_em: '2026-10-18T10:00:00Z' }));
    };
    const linhas = await editaisAbertosSitemap(40000, 40000);
    expect(linhas).toHaveLength(2500);
    expect(linhas[0]).toEqual({ slug: 's-40000', atualizada_pncp_em: '2026-10-18T10:00:00Z' });
    expect(chamadas.map((c) => c.args)).toEqual([
      { p_limite: 1000, p_deslocamento: 40000 },
      { p_limite: 1000, p_deslocamento: 41000 },
      { p_limite: 1000, p_deslocamento: 42000 },
    ]);
    expect(chamadas[0].nome).toBe('editais_abertos_sitemap');
  });

  it('total de abertos', async () => {
    respostaRpc = 81234;
    expect(await totalEditaisAbertos()).toBe(81234);
    expect(chamadas.at(-1)!.nome).toBe('total_editais_abertos');
  });
});
