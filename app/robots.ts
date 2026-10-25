import type { MetadataRoute } from 'next';
import { SITE_URL, url } from '@/lib/seo/site';

/**
 * Robôs de ferramentas de SEO (backlinks, auditoria): não trazem visita e cada página de edital
 * que pedem roda no servidor. Em 25/10/2026 o AhrefsBot sozinho fez 87% das execuções e o plano
 * grátis da Vercel foi pausado. Buscadores e robôs de busca das IAs continuam liberados.
 */
export const ROBOS_DE_FERRAMENTAS = [
  'AhrefsBot',
  'AhrefsSiteAudit',
  'SemrushBot',
  'SiteAuditBot',
  'SERankingBacklinksBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'serpstatbot',
  'Barkrowler',
  'MegaIndex',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/api/' },
      { userAgent: ROBOS_DE_FERRAMENTAS, disallow: '/' },
    ],
    sitemap: url('/sitemap.xml'),
    host: SITE_URL,
  };
}
