export const CACHE_PUBLICO: HeadersInit = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };

/** Respostas que dependem do visitante (plano, conta) ou que não devem ficar no CDN: nada de cache no CDN nem no navegador. */
export const SEM_CACHE: HeadersInit = { 'Cache-Control': 'private, no-store' };
