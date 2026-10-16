import { sincronizarItens, type Dependencias } from './sincronizar';

export type ResultadoReleitura = { compras: number; comItens: number; falhas: number };

/**
 * Relê os itens de todas as compras abertas e regrava palavras + resumo (útil quando a regra do resumo muda).
 * Páginas de compras por id; cada lote vai para `sincronizarItens`, que respeita o paralelismo do cliente.
 */
export async function relerItensAbertos(
  deps: Dependencias,
  opcoes: { pagina?: number; lote?: number } = {},
): Promise<ResultadoReleitura> {
  const tamanhoPagina = opcoes.pagina ?? 500;
  const tamanhoLote = opcoes.lote ?? 20;
  const r: ResultadoReleitura = { compras: 0, comItens: 0, falhas: 0 };
  let depoisDe: string | null = null;
  for (;;) {
    const compras = await deps.banco.abertas(depoisDe, tamanhoPagina);
    if (compras.length === 0) return r;
    for (let i = 0; i < compras.length; i += tamanhoLote) {
      const lote = compras.slice(i, i + tamanhoLote);
      const gravadas = await sincronizarItens(lote, deps);
      r.compras += lote.length;
      r.comItens += gravadas.size;
      r.falhas += lote.length - gravadas.size;
      deps.log?.(`[reler] ${r.compras} compras · ${r.falhas} falhas`);
    }
    depoisDe = compras[compras.length - 1].id;
    if (compras.length < tamanhoPagina) return r;
  }
}
