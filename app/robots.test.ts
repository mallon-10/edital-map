import { expect, it } from 'vitest';
import robots, { ROBOS_DE_FERRAMENTAS } from './robots';

it('libera o site, bloqueia /api/ e aponta o sitemap', () => {
  const r = robots();
  expect(r.rules).toContainEqual({ userAgent: '*', allow: '/', disallow: '/api/' });
  expect(r.sitemap).toBe('https://www.editalmap.com.br/sitemap.xml');
  expect(r.host).toBe('https://www.editalmap.com.br');
});

it('fecha o site inteiro para os robôs de ferramentas de SEO', () => {
  expect(robots().rules).toContainEqual({ userAgent: ROBOS_DE_FERRAMENTAS, disallow: '/' });
  expect(ROBOS_DE_FERRAMENTAS).toEqual(expect.arrayContaining(['AhrefsBot', 'SemrushBot', 'SERankingBacklinksBot']));
});

it('nunca fecha buscadores nem os robôs de busca das IAs', () => {
  for (const r of ['Googlebot', 'bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Applebot', 'DuckDuckBot']) {
    expect(ROBOS_DE_FERRAMENTAS).not.toContain(r);
  }
});
