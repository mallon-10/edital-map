/** O pedaço de `window` que a troca de endereço usa (injetável nos testes). */
export type Janela = {
  location: Pick<Location, 'pathname' | 'search'>;
  history: Pick<History, 'state' | 'replaceState'>;
};

/**
 * Escreve `url` no endereço sem recarregar nem criar entrada no histórico, preservando o estado que o Next guarda na
 * entrada (`__NA` e a árvore). Com `null`, a entrada perde esse estado: na primeira carga o efeito do Explorador roda
 * antes de o Next instalar o replaceState dele e o original apaga a árvore; depois, ao voltar do edital, o popstate
 * chega sem estado e o Next não desenha a busca. Com o estado do Next, o replaceState dele vai direto ao original
 * (sem ACTION_RESTORE, que descartaria uma ida ao edital ainda carregando).
 */
export function trocarEndereco(url: string, janela: Janela = window): void {
  const { location, history } = janela;
  if (location.pathname + location.search === url) return;
  history.replaceState(history.state, '', url);
}
