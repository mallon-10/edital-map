import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CartoesPlanos } from '@/components/planos/CartoesPlanos';
import { LINHAS_PLANOS, PLANOS, precoDoPlano } from './planos';

describe('cartões de planos (celular)', () => {
  const html = renderToStaticMarkup(createElement(CartoesPlanos));
  it('um cartão por plano, com nome, preço e todos os recursos', () => {
    expect(html.match(/<li /g)).toHaveLength(PLANOS.length);
    for (const p of PLANOS) {
      expect(html).toContain(p.nome);
      expect(html).toContain(precoDoPlano(p.centavosMes, 'mensal').principal);
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

describe('cartões de planos no anual', () => {
  const html = renderToStaticMarkup(createElement(CartoesPlanos, { periodo: 'anual' }));
  it('mostra o preço do ano, o equivalente por mês e o título do diálogo com "anual"', () => {
    expect(html).toContain('R$ 499,00/ano');
    expect(html).toContain('R$ 74,92/mês · 2 meses grátis');
    expect(html).toContain('Plano Pro anual');
  });
});
