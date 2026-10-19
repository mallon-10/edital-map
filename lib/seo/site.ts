/** Endereço canônico do site (o edital-map.vercel.app também responde, mas o canônico é sempre este). */
export const SITE_URL = 'https://www.editalmap.com.br';
export const NOME_SITE = 'Edital Map';

export function url(caminho: string): string {
  return `${SITE_URL}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}

/** Base do Open Graph: as páginas que trocam o `openGraph` perdem o do layout, então espalham esta (com a imagem de app/opengraph-image.tsx). */
export const OPEN_GRAPH_BASE = {
  type: 'website' as const,
  locale: 'pt_BR',
  siteName: NOME_SITE,
  images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Edital Map: licitações abertas no Brasil, no mapa' }],
};
