import type { MetadataRoute } from 'next';
import { SITE_URL, url } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: url('/sitemap.xml'), host: SITE_URL };
}
