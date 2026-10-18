/** Endereço canônico do site (o edital-map.vercel.app também responde, mas o canônico é sempre este). */
export const SITE_URL = 'https://www.editalmap.com.br';
export const NOME_SITE = 'Edital Map';

export function url(caminho: string): string {
  return `${SITE_URL}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}
