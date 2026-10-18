import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerFiltros } from '../filtros';
import { combinacaoBusca } from '../limites';

vi.mock('server-only', () => ({}));

type Resposta = { data: unknown; error: { message: string } | null };
type Consulta = {
  select: (...a: unknown[]) => Consulta;
  eq: (coluna: string, valor: unknown) => Consulta;
  gte: (coluna: string, valor: unknown) => Promise<{ count: number; error: null }>;
};

const m = vi.hoisted(() => ({
  rpcs: [] as Array<{ nome: string; args: Record<string, unknown> }>,
  resposta: { data: null, error: null } as { data: unknown; error: { message: string } | null },
  filtrosEventos: [] as Array<[string, unknown]>,
  eventosHoje: 0,
  gravarEvento: vi.fn(async (..._a: unknown[]) => undefined),
  plano: 'gratis' as 'gratis' | 'basic' | 'pro',
  ligado: true,
}));

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: Record<string, unknown>) => {
      m.rpcs.push({ nome, args });
      return { single: (): Promise<Resposta> => Promise.resolve(m.resposta) };
    },
    from: (tabela: string) => {
      const consulta: Consulta = {
        select: () => consulta,
        eq: (coluna, valor) => {
          m.filtrosEventos.push([`${tabela}.${coluna}`, valor]);
          return consulta;
        },
        gte: (coluna, valor) => {
          m.filtrosEventos.push([`${tabela}.${coluna} >=`, valor]);
          return Promise.resolve({ count: m.eventosHoje, error: null });
        },
      };
      return consulta;
    },
  }),
}));
vi.mock('./registro', () => ({ gravarEvento: m.gravarEvento }));
vi.mock('./plano', () => ({
  planoAtual: async (ctx: { dono: boolean } | null) => (ctx?.dono ? 'pro' : m.plano),
  pagamentoLigado: () => m.ligado,
}));

const { avisarLimite, chaveDaBusca, decidirBusca, decidirEdital, inicioDoDiaDeBrasilia, semRecursoPro, usoDoDia } = await import('./uso');

const CTX = { visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: null };
const SLUG = '00394452000103-2026-21982';
const busca = (qs: string) => lerFiltros(new URLSearchParams(qs));
const chave = (qs: string) => chaveDaBusca(combinacaoBusca(busca(qs)) as string);

beforeEach(() => {
  m.rpcs.length = 0;
  m.filtrosEventos.length = 0;
  m.eventosHoje = 0;
  m.gravarEvento.mockClear();
  m.resposta = { data: { permitido: true, usados: 1 }, error: null };
  m.plano = 'gratis';
  m.ligado = true;
});

describe('chaveDaBusca', () => {
  it('32 caracteres hex; a mesma para a mesma combinação', () => {
    expect(chave('q=luva')).toMatch(/^[0-9a-f]{32}$/);
    expect(chave('q=luva')).toBe(chave('q=LUVA&dias=7'));
    expect(chave('q=luva')).not.toBe(chave('q=luva&uf=SC'));
  });
});

describe('decidirBusca', () => {
  it('busca nova: registra a combinação com o limite do grátis', async () => {
    m.resposta = { data: { permitido: true, usados: 2 }, error: null };
    expect(await decidirBusca(CTX, busca('q=luva&uf=SC'), { avisar: true })).toEqual({ permitido: true, usados: 2 });
    expect(m.rpcs).toEqual([
      { nome: 'registrar_uso', args: { p_visitante: CTX.visitante, p_tipo: 'busca', p_chave: chave('q=luva&uf=SC'), p_limite: 3 } },
    ]);
  });
  it('lista, mapa, prazo, página e ordem da mesma busca usam a mesma chave', async () => {
    await decidirBusca(CTX, busca('q=luva&ibge=4209102'), { avisar: true });
    await decidirBusca(CTX, busca('q=luva&ibge=4209102&dias=7&pagina=3&ordem=maior_valor'), { avisar: false });
    expect(m.rpcs[0].args.p_chave).toBe(m.rpcs[1].args.p_chave);
  });
  it('não conta: página inicial vazia, dono, sem visitante', async () => {
    expect(await decidirBusca(CTX, busca(''), { avisar: true })).toEqual({ permitido: true, usados: null });
    expect(await decidirBusca({ ...CTX, interno: true, dono: true }, busca('q=luva'), { avisar: true })).toEqual({ permitido: true, usados: null });
    expect(await decidirBusca(null, busca('q=luva'), { avisar: true })).toEqual({ permitido: true, usados: null });
    expect(m.rpcs).toEqual([]);
  });
  it('4ª busca nova: recusada com o limite; limite_atingido só na primeira vez do dia', async () => {
    m.resposta = { data: { permitido: false, usados: 3 }, error: null };
    expect(await decidirBusca(CTX, busca('q=botina'), { avisar: true })).toEqual({
      permitido: false, limite: { tipo: 'busca', usados: 3, maximo: 3 }, plano: 'gratis',
    });
    expect(m.filtrosEventos).toContainEqual(['eventos.visitante', CTX.visitante]);
    expect(m.filtrosEventos).toContainEqual(['eventos.tipo', 'limite_atingido']);
    expect(m.filtrosEventos).toContainEqual(['eventos.detalhe->>tipo', 'busca']);
    expect(m.gravarEvento).toHaveBeenCalledWith(CTX, 'limite_atingido', { tipo: 'busca' });
    m.gravarEvento.mockClear();
    m.eventosHoje = 1;
    await decidirBusca(CTX, busca('q=capacete'), { avisar: true });
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('o mapa e a exportação não avisam', async () => {
    m.resposta = { data: { permitido: false, usados: 3 }, error: null };
    await decidirBusca(CTX, busca('q=botina'), { avisar: false });
    expect(m.filtrosEventos).toEqual([]);
    expect(m.gravarEvento).not.toHaveBeenCalled();
  });
  it('banco fora: libera (o limite é um lembrete)', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.resposta = { data: null, error: { message: 'timeout' } };
    expect(await decidirBusca(CTX, busca('q=luva'), { avisar: true })).toEqual({ permitido: true, usados: null });
    erro.mockRestore();
  });
});

describe('decidirEdital', () => {
  it('a chave é o slug e o tipo é edital', async () => {
    await decidirEdital(CTX, SLUG);
    expect(m.rpcs).toEqual([{ nome: 'registrar_uso', args: { p_visitante: CTX.visitante, p_tipo: 'edital', p_chave: SLUG, p_limite: 3 } }]);
  });
  it('4º edital: recusado e avisa', async () => {
    m.resposta = { data: { permitido: false, usados: 3 }, error: null };
    expect(await decidirEdital(CTX, SLUG)).toEqual({ permitido: false, limite: { tipo: 'edital', usados: 3, maximo: 3 }, plano: 'gratis' });
    expect(m.gravarEvento).toHaveBeenCalledWith(CTX, 'limite_atingido', { tipo: 'edital' });
  });
  it('dono abre sem limite e sem consulta', async () => {
    expect(await decidirEdital({ ...CTX, interno: true, dono: true }, SLUG)).toEqual({ permitido: true, usados: null });
    expect(m.rpcs).toEqual([]);
  });
  it('com o pagamento ligado, o em_interno sozinho é contado como qualquer um', async () => {
    await decidirEdital({ ...CTX, interno: true }, SLUG);
    expect(m.rpcs).toHaveLength(1);
  });
  it('com o pagamento desligado, o interno continua livre (como antes da cobrança)', async () => {
    m.ligado = false;
    expect(await decidirEdital({ ...CTX, interno: true }, SLUG)).toEqual({ permitido: true, usados: null });
    expect(m.rpcs).toEqual([]);
  });
  it('Basic: limite 15; recusa traz o plano', async () => {
    m.plano = 'basic';
    m.resposta = { data: { permitido: false, usados: 15 }, error: null };
    expect(await decidirEdital(CTX, SLUG)).toEqual({ permitido: false, limite: { tipo: 'edital', usados: 15, maximo: 15 }, plano: 'basic' });
    expect(m.rpcs[0].args.p_limite).toBe(15);
  });
  it('Pro: uso justo de 300', async () => {
    m.plano = 'pro';
    await decidirBusca(CTX, busca('q=luva'), { avisar: true });
    expect(m.rpcs[0].args.p_limite).toBe(300);
  });
});

describe('usoDoDia', () => {
  it('lê buscas e editais de hoje', async () => {
    m.resposta = { data: { buscas: 2, editais: 1 }, error: null };
    expect(await usoDoDia(CTX)).toEqual({ interno: false, plano: 'gratis', pagamento: true, buscas: 2, editais: 1 });
    expect(m.rpcs).toEqual([{ nome: 'uso_do_dia', args: { p_visitante: CTX.visitante } }]);
  });
  it('Basic: o plano vem junto', async () => {
    m.plano = 'basic';
    m.resposta = { data: { buscas: 4, editais: 0 }, error: null };
    expect(await usoDoDia(CTX)).toEqual({ interno: false, plano: 'basic', pagamento: true, buscas: 4, editais: 0 });
  });
  it('dono: sem consulta; sem visitante: null; banco fora: null', async () => {
    expect(await usoDoDia({ ...CTX, interno: true, dono: true })).toEqual({ interno: true, plano: 'pro', pagamento: true, buscas: 0, editais: 0 });
    expect(await usoDoDia(null)).toBeNull();
    expect(m.rpcs).toEqual([]);
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    m.resposta = { data: null, error: { message: 'timeout' } };
    expect(await usoDoDia(CTX)).toBeNull();
    erro.mockRestore();
  });
});

describe('virada do dia em Brasília', () => {
  it('o dia começa às 03h UTC', () => {
    expect(inicioDoDiaDeBrasilia(new Date('2026-10-18T02:59:59Z'))).toBe('2026-10-17T03:00:00.000Z');
    expect(inicioDoDiaDeBrasilia(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-18T03:00:00.000Z');
  });
  it('avisarLimite procura o evento desde o começo do dia de Brasília', async () => {
    await avisarLimite(CTX, 'busca', new Date('2026-10-18T02:00:00Z'));
    expect(m.filtrosEventos).toContainEqual(['eventos.criado_em >=', '2026-10-17T03:00:00.000Z']);
  });
});

describe('semRecursoPro', () => {
  it('pagamento desligado: nada é barrado', async () => {
    m.ligado = false;
    expect(await semRecursoPro(CTX)).toBe(false);
  });
  it('grátis e Basic barrados; Pro e dono liberados', async () => {
    expect(await semRecursoPro(CTX)).toBe(true);
    m.plano = 'basic';
    expect(await semRecursoPro(CTX)).toBe(true);
    m.plano = 'pro';
    expect(await semRecursoPro(CTX)).toBe(false);
    m.plano = 'gratis';
    expect(await semRecursoPro({ ...CTX, interno: true, dono: true })).toBe(false);
  });
});
