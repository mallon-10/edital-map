import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { itensDoPncp } = await import('./itensPncp');

const compra = { id: 'C1', cnpj: '00394452000103', ano: 2026, sequencial: 21982 };
const item = (numero: number, extra: Record<string, unknown> = {}) => ({
  numeroItem: numero,
  descricao: ` Luva nitrílica ${numero} `,
  quantidade: 10,
  unidadeMedida: 'Par',
  valorUnitarioEstimado: 2.5,
  valorTotal: 25,
  materialOuServico: 'M',
  orcamentoSigiloso: false,
  temResultado: false,
  ...extra,
});
const pagina = (de: number, quantos: number) => Array.from({ length: quantos }, (_, i) => item(de + i));

function fetchFalso(respostas: Array<Response | Error>) {
  const urls: string[] = [];
  const f = (async (url: string | URL | Request) => {
    urls.push(String(url));
    const proxima = respostas.shift();
    if (!proxima) throw new Error('teste sem resposta preparada');
    if (proxima instanceof Error) throw proxima;
    return proxima;
  }) as typeof fetch;
  return { f, urls };
}
const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 });

describe('itensDoPncp', () => {
  it('lê a base de itens do PNCP e mapeia como a lista do edital (mesma limpeza do worker)', async () => {
    const { f, urls } = fetchFalso([ok([item(1, { tipoBeneficio: 1, tipoBeneficioNome: 'Exclusiva ME/EPP', criterioJulgamentoNome: 'Menor preço' })])]);
    const itens = await itensDoPncp(compra, 50, f, 'https://pncp.gov.br/api/pncp');
    expect(urls).toEqual(['https://pncp.gov.br/api/pncp/v1/orgaos/00394452000103/compras/2026/21982/itens?pagina=1&tamanhoPagina=50']);
    expect(itens).toEqual([
      {
        numero: 1,
        descricao: 'Luva nitrílica 1',
        quantidade: 10,
        unidade: 'Par',
        valor_unitario_estimado: 2.5,
        valor_total_estimado: 25,
        sigiloso: false,
        material_ou_servico: 'M',
        beneficio_id: 1,
        beneficio_nome: 'Exclusiva ME/EPP',
        criterio_julgamento: 'Menor preço',
      },
    ]);
  });
  it('para no limite pedido sem pedir a página seguinte', async () => {
    const { f, urls } = fetchFalso([ok(pagina(1, 50))]);
    expect(await itensDoPncp(compra, 50, f)).toHaveLength(50);
    expect(urls).toHaveLength(1);
  });
  it('com limite maior, pede as páginas seguintes até vir uma incompleta', async () => {
    const { f, urls } = fetchFalso([ok(pagina(1, 50)), ok(pagina(51, 3))]);
    const itens = await itensDoPncp(compra, 2000, f);
    expect(itens.map((i) => i.numero)).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));
    expect(urls[1]).toContain('pagina=2&tamanhoPagina=50');
  });
  it('204 é edital sem itens', async () => {
    const { f } = fetchFalso([new Response(null, { status: 204 })]);
    expect(await itensDoPncp(compra, 50, f)).toEqual([]);
  });
  it('ignora item inválido e mantém os outros', async () => {
    const { f } = fetchFalso([ok([item(1), { numeroItem: 2 }])]);
    expect((await itensDoPncp(compra, 50, f)).map((i) => i.numero)).toEqual([1]);
  });
  it('HTTP de erro e rede fora viram exceção', async () => {
    await expect(itensDoPncp(compra, 50, fetchFalso([new Response('x', { status: 500 })]).f)).rejects.toThrow('itens do PNCP: HTTP 500');
    await expect(itensDoPncp(compra, 50, fetchFalso([new TypeError('fetch failed')]).f)).rejects.toThrow('fetch failed');
  });
  it('a base pode ser trocada (simulação de falha)', async () => {
    const { f, urls } = fetchFalso([ok([])]);
    await itensDoPncp(compra, 50, f, 'http://127.0.0.1:9');
    expect(urls[0].startsWith('http://127.0.0.1:9/v1/orgaos/')).toBe(true);
  });
  it('prazo total esgotado vira exceção, não lista parcial', async () => {
    let chamadas = 0;
    const lento = ((_url: string | URL | Request, init?: RequestInit) => {
      chamadas++;
      if (chamadas === 1) return Promise.resolve(ok(pagina(1, 50)));
      return new Promise<Response>((_, rejeitar) => {
        init?.signal?.addEventListener('abort', () => rejeitar(new DOMException('aborted', 'AbortError')));
      });
    }) as typeof fetch;
    await expect(itensDoPncp(compra, 2000, lento, 'https://pncp.gov.br/api/pncp', 50)).rejects.toThrow('prazo total esgotado');
    expect(chamadas).toBe(2);
  });
});
