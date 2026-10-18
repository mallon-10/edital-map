import { MAX_PAGINA, POR_PAGINA } from './filtros';

/** Quantas páginas a lista tem (pelo menos 1, no máximo MAX_PAGINA). */
export function totalPaginas(total: number, porPagina = POR_PAGINA): number {
  return Math.min(MAX_PAGINA, Math.max(1, Math.ceil(total / porPagina)));
}

export type ItemPaginacao = number | 'reticencias';

/** Até 7 páginas, todas; senão a primeira, a última e a vizinhança da atual, com reticências nos buracos. */
export function itensPaginacao(atual: number, total: number): ItemPaginacao[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const a = Math.min(Math.max(1, atual), total);
  let inicio = Math.max(2, a - 1);
  let fim = Math.min(total - 1, a + 1);
  if (a <= 3) {
    inicio = 2;
    fim = 4;
  }
  if (a >= total - 2) {
    inicio = total - 3;
    fim = total - 1;
  }
  const itens: ItemPaginacao[] = [1];
  if (inicio > 2) itens.push('reticencias');
  for (let n = inicio; n <= fim; n++) itens.push(n);
  if (fim < total - 1) itens.push('reticencias');
  itens.push(total);
  return itens;
}
