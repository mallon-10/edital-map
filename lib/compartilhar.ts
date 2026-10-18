export type ModoCompartilhar = 'nativo' | 'copiar' | 'mostrar';

/** Celular com Web Share: a folha do sistema. Computador: copiar o link. Sem área de transferência: Web Share ou mostrar o link. */
export function modoCompartilhar(a: { temShare: boolean; celular: boolean; temCopiar: boolean }): ModoCompartilhar {
  if (a.celular && a.temShare) return 'nativo';
  if (a.temCopiar) return 'copiar';
  return a.temShare ? 'nativo' : 'mostrar';
}

export const LINK_COPIADO = 'Link copiado';

/** Endereço do edital para compartilhar: sem parâmetros (?itens=todos) nem âncora. */
export function linkDoEdital(origem: string, slug: string): string {
  return `${origem}/edital/${slug}`;
}
