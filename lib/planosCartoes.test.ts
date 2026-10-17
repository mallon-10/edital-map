import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CartoesPlanos } from '@/components/planos/CartoesPlanos';
import { LINHAS_PLANOS, PLANOS } from './planos';

describe('cartões de planos (celular)', () => {
  const html = renderToStaticMarkup(createElement(CartoesPlanos));
  it('um cartão por plano, com nome, preço e todos os recursos', () => {
    expect(html.match(/<li /g)).toHaveLength(PLANOS.length);
    for (const p of PLANOS) {
      expect(html).toContain(p.nome);
      expect(html).toContain(p.preco.replace('/', '/'));
    }
    for (const l of LINHAS_PLANOS) expect(html.split(l.recurso.replace(/"/g, '&quot;')).length - 1).toBe(PLANOS.length);
  });
  it('botões só no Basic e no Pro; Grátis mostra o plano de hoje', () => {
    expect(html).toContain('Quero o Basic');
    expect(html).toContain('Quero o Pro');
    expect(html).toContain('Seu plano hoje');
  });
  it('não repete ids (âncoras ficam na página)', () => {
    expect(html).not.toMatch(/ id="(basic|pro|gratis)"/);
  });
});
