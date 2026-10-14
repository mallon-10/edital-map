import { describe, expect, it } from 'vitest';
import { criarCliente, criarLimitador, criarRitmo, ErroPncp, type OpcoesCliente } from './cliente';

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });
}

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

function montar(respostas: Array<Response | Error>, extras: OpcoesCliente = {}) {
  const { f, urls } = fetchFalso(respostas);
  const esperas: number[] = [];
  const cliente = criarCliente({
    fetch: f,
    esperar: async (ms) => {
      esperas.push(ms);
    },
    aleatorio: () => 0,
    relogio: () => 0,
    consultaPorMinuto: 6000,
    consultaRajada: 1000,
    ...extras,
  });
  return { cliente, urls, esperas };
}

const filtro = { uf: 'SC', modalidade: 6, dataInicial: '2026-10-13', dataFinal: '2026-10-14' };
const compra = { id: 'C1', cnpj: '00394452000103', ano: 2026, sequencial: 21982 };

describe('getJson', () => {
  it('tenta de novo depois de um 429, esperando 30 s', async () => {
    const { cliente, esperas } = montar([resposta(429), resposta(200, { a: 1 })]);
    await expect(cliente.getJson('https://x')).resolves.toEqual({ a: 1 });
    expect(esperas).toEqual([30000]);
    expect(cliente.estatisticas()).toEqual({ chamadas: 2, novasTentativas: 1, respostas429: 1 });
  });
  it('desiste depois de 4 respostas 429, esperando 30, 60 e 120 s', async () => {
    const { cliente, esperas } = montar([resposta(429), resposta(429), resposta(429), resposta(429)]);
    await expect(cliente.getJson('https://x')).rejects.toThrow('Falhou 4 vezes');
    expect(esperas).toEqual([30000, 60000, 120000]);
    expect(cliente.estatisticas().respostas429).toBe(4);
  });
  it('desiste depois de 4 falhas, esperando 2, 4 e 8 s', async () => {
    const { cliente, esperas } = montar([resposta(503), resposta(503), resposta(503), resposta(503)]);
    await expect(cliente.getJson('https://x')).rejects.toThrow('Falhou 4 vezes');
    expect(esperas).toEqual([2000, 4000, 8000]);
  });
  it('não tenta de novo em erro 4xx que não é 429', async () => {
    const { cliente, esperas } = montar([resposta(400, { message: 'Tamanho de página inválido' })]);
    await expect(cliente.getJson('https://x')).rejects.toBeInstanceOf(ErroPncp);
    expect(esperas).toEqual([]);
    expect(cliente.estatisticas().chamadas).toBe(1);
  });
  it('204 vira null', async () => {
    const { cliente } = montar([resposta(204)]);
    await expect(cliente.getJson('https://x')).resolves.toBeNull();
  });
  it('tenta de novo depois de erro de rede', async () => {
    const { cliente } = montar([new TypeError('fetch failed'), resposta(200, [1])]);
    await expect(cliente.getJson('https://x')).resolves.toEqual([1]);
  });
});

describe('paginarContratacoes', () => {
  it('percorre até a última página e monta os parâmetros', async () => {
    const { cliente, urls } = montar([
      resposta(200, { data: ['a', 'b'], totalPaginas: 2, totalRegistros: 3 }),
      resposta(200, { data: ['c'], totalPaginas: 2, totalRegistros: 3 }),
    ]);
    const paginas = [];
    for await (const p of cliente.paginarContratacoes('atualizacao', filtro)) paginas.push(p);
    expect(paginas.map((p) => p.registros)).toEqual([['a', 'b'], ['c']]);
    expect(urls[0]).toContain('/v1/contratacoes/atualizacao?');
    expect(urls[0]).toContain('dataInicial=20261013');
    expect(urls[0]).toContain('dataFinal=20261014');
    expect(urls[0]).toContain('codigoModalidadeContratacao=6');
    expect(urls[0]).toContain('uf=SC');
    expect(urls[0]).toContain('tamanhoPagina=50');
    expect(urls[1]).toContain('pagina=2');
  });
  it('204 não produz páginas', async () => {
    const { cliente } = montar([resposta(204)]);
    const paginas = [];
    for await (const p of cliente.paginarContratacoes('publicacao', filtro)) paginas.push(p);
    expect(paginas).toEqual([]);
  });
});

describe('listarItens', () => {
  it('junta as páginas até vir uma com menos de 50', async () => {
    const cheia = Array.from({ length: 50 }, (_, i) => ({ numeroItem: i + 1 }));
    const { cliente, urls } = montar([resposta(200, cheia), resposta(200, [{ numeroItem: 51 }])]);
    const itens = await cliente.listarItens(compra);
    expect(itens).toHaveLength(51);
    expect(urls[0]).toBe(
      'https://pncp.gov.br/api/pncp/v1/orgaos/00394452000103/compras/2026/21982/itens?pagina=1&tamanhoPagina=50',
    );
    expect(urls[1]).toContain('pagina=2&tamanhoPagina=50');
  });
  it('página de exatamente 50 pede a seguinte', async () => {
    const cheia = Array.from({ length: 50 }, (_, i) => ({ numeroItem: i + 1 }));
    const { cliente, urls } = montar([resposta(200, cheia), resposta(200, [])]);
    expect(await cliente.listarItens(compra)).toHaveLength(50);
    expect(urls).toHaveLength(2);
  });
});

describe('ritmo da API de consulta', () => {
  it('só a consulta passa pelo ritmo; itens não', async () => {
    const itens = montar([resposta(200, []), resposta(200, [])], { consultaPorMinuto: 20, consultaRajada: 1 });
    await itens.cliente.listarItens(compra);
    await itens.cliente.listarItens(compra);
    expect(itens.esperas).toEqual([]);

    const consulta = montar([resposta(200, {}), resposta(200, {})], { consultaPorMinuto: 20, consultaRajada: 1 });
    await consulta.cliente.getJson('https://pncp.gov.br/api/consulta/v1/a');
    await consulta.cliente.getJson('https://pncp.gov.br/api/consulta/v1/b');
    expect(consulta.esperas).toEqual([3000]);
  });
});

describe('criarRitmo', () => {
  it('deixa a rajada sair sem espera e depois segura no intervalo', async () => {
    let agora = 0;
    const esperas: number[] = [];
    const aguardarVez = criarRitmo(20, 2, () => agora, async (ms) => {
      esperas.push(ms);
      agora += ms;
    });
    for (let i = 0; i < 5; i++) await aguardarVez();
    expect(esperas).toEqual([3000, 3000, 3000]);
  });
  it('repõe fichas com o passar do tempo', async () => {
    let agora = 0;
    const esperas: number[] = [];
    const aguardarVez = criarRitmo(20, 1, () => agora, async (ms) => {
      esperas.push(ms);
      agora += ms;
    });
    await aguardarVez();
    agora += 3000;
    await aguardarVez();
    expect(esperas).toEqual([]);
  });
});

describe('criarLimitador', () => {
  it('nunca passa do máximo de tarefas ao mesmo tempo', async () => {
    const limitar = criarLimitador(2);
    let ativas = 0;
    let pico = 0;
    const tarefa = () =>
      limitar(async () => {
        ativas++;
        pico = Math.max(pico, ativas);
        await new Promise((r) => setTimeout(r, 5));
        ativas--;
      });
    await Promise.all([1, 2, 3, 4, 5].map(tarefa));
    expect(pico).toBe(2);
  });
});
