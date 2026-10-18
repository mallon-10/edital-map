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

/** A pessoa fechou a folha do sistema (AbortError): não é falha, nada a fazer. Qualquer outro erro cai na cópia do link. */
export function foiCancelamento(erro: unknown): boolean {
  return typeof erro === 'object' && erro !== null && (erro as { name?: unknown }).name === 'AbortError';
}

/** Avisos curtos somem sozinhos; o link para copiar à mão fica até a pessoa fechar. */
export const AVISO_CURTO_MS = 4000;
export function prefixoManual(): string {
  return 'Copie o link: ';
}
export function ehAvisoManual(aviso: string | null): boolean {
  return aviso !== null && aviso.startsWith(prefixoManual());
}
