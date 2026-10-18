import { expect, it } from 'vitest';
import robots from './robots';

it('libera o site, bloqueia /api/ e aponta o sitemap', () => {
  expect(robots()).toEqual({
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: 'https://www.editalmap.com.br/sitemap.xml',
    host: 'https://www.editalmap.com.br',
  });
});
