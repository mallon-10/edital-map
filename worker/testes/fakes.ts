import { readFileSync } from 'node:fs';
import type { Banco, EstadoSync } from '../banco';
import type { ChaveCompra, LinhaContratacao, LinhaItem } from '../mapear';
import type { FiltroContratacoes, PaginaContratacoes } from '../pncp/cliente';
import { Resumo } from '../resumo';
import type { Dependencias } from '../sincronizar';

const ler = (nome: string) =>
  JSON.parse(readFileSync(new URL(`../__fixtures__/${nome}`, import.meta.url), 'utf8')) as Record<string, unknown>;
const CONTRATACAO = ler('contratacao.json');
const ITEM = ler('item.json');

/** 14/10/2026 12:00 em Brasília. */
export const AGORA = new Date('2026-10-14T15:00:00Z');

export function contratacaoBruta(
  opcoes: { sequencial?: number; encerramento?: string | null; atualizacao?: string } = {},
): Record<string, unknown> {
  const sequencial = opcoes.sequencial ?? 1;
  return {
    ...CONTRATACAO,
    numeroControlePNCP: `00394452000103-1-${String(sequencial).padStart(6, '0')}/2026`,
    sequencialCompra: sequencial,
    dataEncerramentoProposta:
      opcoes.encerramento === undefined ? CONTRATACAO.dataEncerramentoProposta : opcoes.encerramento,
    dataAtualizacaoGlobal: opcoes.atualizacao ?? CONTRATACAO.dataAtualizacaoGlobal,
  };
}

export function idDe(sequencial: number): string {
  return `00394452000103-1-${String(sequencial).padStart(6, '0')}/2026`;
}

export function itemBruto(numero: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...ITEM, numeroItem: numero, ...extra };
}

export class BancoFalso implements Banco {
  contratacoes = new Map<string, LinhaContratacao>();
  itens = new Map<string, LinhaItem>();
  estados = new Map<string, EstadoSync>();
  remocoes: Array<{ contratacaoId: string; numeros: number[] }> = [];

  async upsertContratacoes(linhas: LinhaContratacao[]): Promise<void> {
    for (const l of linhas) this.contratacoes.set(l.id, l);
  }
  async upsertItens(linhas: LinhaItem[]): Promise<void> {
    for (const l of linhas) this.itens.set(`${l.contratacao_id}#${l.numero}`, l);
  }
  async removerItensAlem(contratacaoId: string, numeros: number[]): Promise<void> {
    this.remocoes.push({ contratacaoId, numeros });
    for (const [k, v] of this.itens) {
      if (v.contratacao_id === contratacaoId && !numeros.includes(v.numero)) this.itens.delete(k);
    }
  }
  async atualizacoesConhecidas(ids: string[]): Promise<Map<string, string>> {
    const mapa = new Map<string, string>();
    for (const id of ids) {
      const c = this.contratacoes.get(id);
      if (c) mapa.set(id, c.atualizada_pncp_em);
    }
    return mapa;
  }
  async abertasSemItens(limite: number): Promise<ChaveCompra[]> {
    return [...this.contratacoes.values()]
      .filter((c) => c.encerramento_em !== null && Date.parse(c.encerramento_em) > AGORA.getTime())
      .filter((c) => !this.itensDe(c.id).length)
      .slice(0, limite)
      .map((c) => ({ id: c.id, cnpj: c.cnpj, ano: c.ano, sequencial: c.sequencial }));
  }
  async abertas(depoisDe: string | null, limite: number): Promise<ChaveCompra[]> {
    return [...this.contratacoes.values()]
      .filter((c) => c.encerramento_em !== null && Date.parse(c.encerramento_em) > AGORA.getTime())
      .filter((c) => depoisDe === null || c.id > depoisDe)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, limite)
      .map((c) => ({ id: c.id, cnpj: c.cnpj, ano: c.ano, sequencial: c.sequencial }));
  }
  async lerEstado(chave: string): Promise<EstadoSync | null> {
    return this.estados.get(chave) ?? null;
  }
  async gravarEstado(estado: EstadoSync): Promise<void> {
    this.estados.set(estado.chave, estado);
  }
  itensDe(id: string): LinhaItem[] {
    return [...this.itens.values()].filter((i) => i.contratacao_id === id);
  }
}

type Endpoint = 'publicacao' | 'atualizacao';

export function clienteFalso(
  opcoes: {
    paginas?: (endpoint: Endpoint, filtro: FiltroContratacoes) => unknown[][];
    itens?: (compra: ChaveCompra) => unknown[];
  } = {},
) {
  const chamadas: Array<{ endpoint: Endpoint; filtro: FiltroContratacoes }> = [];
  const itensPedidos: string[] = [];
  return {
    chamadas,
    itensPedidos,
    async *paginarContratacoes(endpoint: Endpoint, filtro: FiltroContratacoes): AsyncGenerator<PaginaContratacoes> {
      chamadas.push({ endpoint, filtro });
      const paginas = opcoes.paginas?.(endpoint, filtro) ?? [];
      for (let i = 0; i < paginas.length; i++) {
        yield { pagina: i + 1, totalPaginas: paginas.length, totalRegistros: paginas.flat().length, registros: paginas[i] };
      }
    },
    async listarItens(compra: ChaveCompra): Promise<unknown[]> {
      itensPedidos.push(compra.id);
      return opcoes.itens?.(compra) ?? [itemBruto(1)];
    },
  };
}

export function montarDeps(banco: BancoFalso, cliente: ReturnType<typeof clienteFalso>): Dependencias {
  return { banco, cliente, resumo: new Resumo('teste'), agora: () => AGORA };
}
