import {
  BASE_CONSULTA,
  BASE_PNCP,
  PAGINA_CONTRATACOES,
  PAGINA_ITENS,
  PARALELISMO,
  TENTATIVAS,
  TIMEOUT_MS,
} from '../config';
import { paraPncp } from '../datas';
import type { ChaveCompra } from '../mapear';

export class ErroPncp extends Error {
  constructor(
    mensagem: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(mensagem);
    this.name = 'ErroPncp';
  }
}

export type FiltroContratacoes = { uf: string; modalidade: number; dataInicial: string; dataFinal: string };
export type PaginaContratacoes = { pagina: number; totalPaginas: number; totalRegistros: number; registros: unknown[] };
export type OpcoesCliente = {
  fetch?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
  aleatorio?: () => number;
  paralelismo?: number;
  tentativas?: number;
  timeoutMs?: number;
};
type RespostaContratacoes = { data?: unknown[]; totalRegistros?: number; totalPaginas?: number };

export function criarLimitador(maximo: number) {
  let ativos = 0;
  const fila: Array<() => void> = [];
  return async function limitar<T>(tarefa: () => Promise<T>): Promise<T> {
    if (ativos < maximo) ativos++;
    else await new Promise<void>((liberar) => fila.push(liberar));
    try {
      return await tarefa();
    } finally {
      // Passa a vaga direto para quem está esperando; só libera se a fila estiver vazia.
      const proxima = fila.shift();
      if (proxima) proxima();
      else ativos--;
    }
  };
}

function podeTentarDeNovo(status: number): boolean {
  return status === 429 || status >= 500;
}

function urlContratacoes(
  endpoint: 'publicacao' | 'atualizacao',
  filtro: FiltroContratacoes,
  pagina: number,
  tamanho: number,
): string {
  const params = new URLSearchParams({
    dataInicial: paraPncp(filtro.dataInicial),
    dataFinal: paraPncp(filtro.dataFinal),
    codigoModalidadeContratacao: String(filtro.modalidade),
    uf: filtro.uf,
    pagina: String(pagina),
    tamanhoPagina: String(tamanho),
  });
  return `${BASE_CONSULTA}/v1/contratacoes/${endpoint}?${params}`;
}

export function criarCliente(opcoes: OpcoesCliente = {}) {
  const buscar = opcoes.fetch ?? fetch;
  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const aleatorio = opcoes.aleatorio ?? Math.random;
  const tentativas = opcoes.tentativas ?? TENTATIVAS;
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_MS;
  const limitar = criarLimitador(opcoes.paralelismo ?? PARALELISMO);
  const contagem = { chamadas: 0, novasTentativas: 0 };

  async function getJson<T>(url: string): Promise<T | null> {
    return limitar(async () => {
      let ultimoErro: unknown;
      for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        if (tentativa > 1) {
          contagem.novasTentativas++;
          await esperar(2000 * 2 ** (tentativa - 2) + Math.floor(aleatorio() * 500));
        }
        contagem.chamadas++;
        try {
          const resp = await buscar(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (resp.status === 204) return null;
          if (resp.ok) {
            const corpo = await resp.text();
            return corpo ? (JSON.parse(corpo) as T) : null;
          }
          const erro = new ErroPncp(
            `HTTP ${resp.status} em ${url}: ${(await resp.text()).slice(0, 200)}`,
            resp.status,
            url,
          );
          if (!podeTentarDeNovo(resp.status)) throw erro;
          ultimoErro = erro;
        } catch (erro) {
          if (erro instanceof ErroPncp && erro.status !== undefined && !podeTentarDeNovo(erro.status)) throw erro;
          ultimoErro = erro;
        }
      }
      const detalhe = ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro);
      throw new ErroPncp(
        `Falhou ${tentativas} vezes: ${url} (${detalhe})`,
        ultimoErro instanceof ErroPncp ? ultimoErro.status : undefined,
        url,
      );
    });
  }

  async function* paginarContratacoes(
    endpoint: 'publicacao' | 'atualizacao',
    filtro: FiltroContratacoes,
  ): AsyncGenerator<PaginaContratacoes> {
    for (let pagina = 1; ; pagina++) {
      const resp = await getJson<RespostaContratacoes>(urlContratacoes(endpoint, filtro, pagina, PAGINA_CONTRATACOES));
      const registros = resp?.data ?? [];
      if (registros.length === 0) return;
      const totalPaginas = resp?.totalPaginas ?? pagina;
      yield { pagina, totalPaginas, totalRegistros: resp?.totalRegistros ?? registros.length, registros };
      if (pagina >= totalPaginas) return;
    }
  }

  async function totalRegistros(endpoint: 'publicacao' | 'atualizacao', filtro: FiltroContratacoes): Promise<number> {
    const resp = await getJson<RespostaContratacoes>(urlContratacoes(endpoint, filtro, 1, 10));
    return resp?.totalRegistros ?? 0;
  }

  async function listarItens(compra: ChaveCompra): Promise<unknown[]> {
    const todos: unknown[] = [];
    for (let pagina = 1; ; pagina++) {
      const url = `${BASE_PNCP}/v1/orgaos/${compra.cnpj}/compras/${compra.ano}/${compra.sequencial}/itens?pagina=${pagina}&tamanhoPagina=${PAGINA_ITENS}`;
      const lote = (await getJson<unknown[]>(url)) ?? [];
      todos.push(...lote);
      if (lote.length < PAGINA_ITENS) return todos;
    }
  }

  async function detalheCompra(compra: ChaveCompra): Promise<unknown | null> {
    return getJson(`${BASE_CONSULTA}/v1/orgaos/${compra.cnpj}/compras/${compra.ano}/${compra.sequencial}`);
  }

  return {
    getJson,
    paginarContratacoes,
    totalRegistros,
    listarItens,
    detalheCompra,
    estatisticas: () => ({ ...contagem }),
  };
}

export type ClientePncp = ReturnType<typeof criarCliente>;
