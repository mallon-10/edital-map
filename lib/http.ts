export const CACHE_PUBLICO: HeadersInit = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };

/** Respostas que dependem do visitante (uso do dia, sinal de limite): nada de cache no CDN nem no navegador. */
export const SEM_CACHE: HeadersInit = { 'Cache-Control': 'private, no-store' };
