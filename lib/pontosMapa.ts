/**
 * Pontos do mapa. Sem filtro nenhum (a página inicial aberta), a busca não conta no limite: os pontos vêm de uma rota
 * pública guardada na CDN (app/dados/mapa-brasil, renovada a cada 5 min) e chegam na hora. Com filtro, /api/mapa conta.
 */
export const URL_MAPA_BRASIL = '/dados/mapa-brasil';

export function urlDosPontos(parametros: URLSearchParams): string {
  const p = parametros.toString();
  return p ? `/api/mapa?${p}` : URL_MAPA_BRASIL;
}
