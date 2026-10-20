export type PistasEntrada = {
  entrada: true;
  site: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  anuncio: boolean;
};

const semWww = (host: string) => host.replace(/^www\./, '');

function hostDe(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Pistas da origem da primeira página do carregamento: domínio de quem mandou (só o domínio), utm_* e clique de anúncio
 * (gclid, gbraid, wbraid). null = veio do próprio site (recarregar, nova aba): não é entrada. O servidor classifica.
 */
export function pistasDaEntrada(referrer: string, endereco: string): PistasEntrada | null {
  const aqui = new URL(endereco);
  const site = referrer ? hostDe(referrer) : null;
  if (site && semWww(site) === semWww(aqui.hostname)) return null;
  const p = aqui.searchParams;
  return {
    entrada: true,
    site,
    utm_source: p.get('utm_source'),
    utm_medium: p.get('utm_medium'),
    utm_campaign: p.get('utm_campaign'),
    anuncio: ['gclid', 'gbraid', 'wbraid'].some((k) => p.has(k)),
  };
}
