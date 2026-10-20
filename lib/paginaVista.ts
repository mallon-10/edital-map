import { SLUG_EDITAL } from './eventos';

/** De onde veio a visita (evento pagina_vista, só na entrada). Ordem = ordem do painel. */
export const ORIGENS = ['google', 'anuncio', 'direto', 'ia', 'redes', 'email', 'outro_buscador', 'outro_site'] as const;
export type Origem = (typeof ORIGENS)[number];

export const NOMES_ORIGEM: Record<Origem, string> = {
  google: 'Google (orgânico)',
  anuncio: 'Anúncio',
  direto: 'Direto',
  ia: 'Assistente de IA',
  redes: 'Redes e WhatsApp',
  email: 'E-mail',
  outro_buscador: 'Outro buscador',
  outro_site: 'Outro site',
};

const CAMINHO = /^\/[a-z0-9\-/]{0,119}$/;

/**
 * Caminho da página vista sem parâmetros, ids nem códigos (o edital fica à parte, pelo slug). null = não grava
 * (painel do dono, API ou caminho fora do formato).
 */
export function paginaDoCaminho(caminho: string): { pagina: string; edital: string | null } | null {
  const limpo = caminho.split(/[?#]/)[0].replace(/(.)\/+$/, '$1');
  const edital = /^\/edital\/([^/]+)$/.exec(limpo);
  if (edital) return { pagina: '/edital', edital: SLUG_EDITAL.test(edital[1]) ? edital[1] : null };
  if (/^\/alertas\/[^/]+\/editar$/.test(limpo)) return { pagina: '/alertas/editar', edital: null };
  if (/^\/obrigado\/[^/]+$/.test(limpo)) return { pagina: '/obrigado', edital: null };
  if (/^\/(admin|api)(\/|$)/.test(limpo) || !CAMINHO.test(limpo)) return null;
  return { pagina: limpo, edital: null };
}

type Pista = { site: string | null; utmSource: string | null; utmMedium: string | null; anuncio: boolean };

const termina = (host: string, dominios: readonly string[]) => dominios.some((d) => host === d || host.endsWith(`.${d}`));
const IA = ['chatgpt.com', 'chat.openai.com', 'gemini.google.com', 'perplexity.ai', 'copilot.microsoft.com', 'claude.ai'];
const EMAIL = ['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'mail.yahoo.com', 'webmail.uol.com.br'];
const REDES = [
  'facebook.com', 'instagram.com', 'linkedin.com', 'lnkd.in', 't.co', 'x.com', 'twitter.com', 'whatsapp.com', 'wa.me',
  'youtube.com', 'tiktok.com', 'threads.net', 'pinterest.com', 'reddit.com', 'telegram.org', 't.me',
];
const BUSCADORES = ['bing.com', 'duckduckgo.com', 'yahoo.com', 'ecosia.org', 'search.brave.com', 'yandex.com'];
const PAGO = /^(cpc|ppc|paid|paid_.+|.+_paid|ads?|display|pmax)$/;

function porDominio(host: string): Origem {
  if (termina(host, IA)) return 'ia';
  if (termina(host, EMAIL)) return 'email';
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google';
  if (termina(host, BUSCADORES)) return 'outro_buscador';
  if (termina(host, REDES)) return 'redes';
  return 'outro_site';
}

function porFonte(fonte: string): Origem {
  const f = fonte.toLowerCase();
  if (/chatgpt|openai|gemini|perplexity|copilot|claude/.test(f)) return 'ia';
  if (/^google/.test(f)) return 'google';
  if (/bing|duckduckgo|yahoo/.test(f)) return 'outro_buscador';
  if (/facebook|instagram|linkedin|whatsapp|twitter|youtube|tiktok|^ig$|^fb$/.test(f)) return 'redes';
  if (/e-?mail|newsletter/.test(f)) return 'email';
  return 'outro_site';
}

/** Origem da entrada pelo domínio de quem mandou (`document.referrer`), pelos utm_* e pelo clique de anúncio (gclid etc.). */
export function classificarOrigem({ site, utmSource, utmMedium, anuncio }: Pista): Origem {
  const meio = (utmMedium ?? '').toLowerCase();
  if (anuncio || PAGO.test(meio)) return 'anuncio';
  if (meio === 'email' || meio === 'e-mail') return 'email';
  if (site) return porDominio(site.toLowerCase());
  if (utmSource) return porFonte(utmSource);
  return 'direto';
}
