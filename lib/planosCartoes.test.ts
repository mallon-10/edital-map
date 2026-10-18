import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CartoesPlanos } from '@/components/planos/CartoesPlanos';
import { LINHAS_PLANOS, PLANOS, precoDoPlano } from './planos';

const sem = (html: string) => html.replace(/<!-- -->/g, '');

describe('cartões de planos (celular)', () => {
  const html = sem(renderToStaticMarkup(createElement(CartoesPlanos)));
  it('um cartão por plano, com nome, preço e todos os recursos', () => {
    expect(html.match(/<li /g)).toHaveLength(PLANOS.length);
    for (const p of PLANOS) {
      expect(html).toContain(p.nome);
      expect(html).toContain(precoDoPlano(p, 'mensal').principal);
    }
    for (const l of LINHAS_PLANOS) expect(html.split(l.recurso.replace(/"/g, '&quot;')).length - 1).toBe(PLANOS.length);
  });
  it('pagamento desligado: lista de espera do Pro; Grátis mostra o plano de hoje', () => {
    expect(html).toContain('Quero o Pro');
    expect(html).not.toContain('Basic');
    expect(html).toContain('Seu plano hoje');
  });
  it('pagamento ligado: Assinar o Pro leva ao checkout próprio', () => {
    const ligado = sem(renderToStaticMarkup(createElement(CartoesPlanos, { pagamento: true })));
    expect(ligado).toContain('href="/assinar?periodo=mensal"');
    expect(ligado).toContain('Assinar o Pro');
  });
  it('não repete ids (âncoras ficam na página)', () => {
    expect(html).not.toMatch(/ id="(basic|pro|gratis)"/);
  });
});

describe('cartões de planos no anual', () => {
  const html = sem(renderToStaticMarkup(createElement(CartoesPlanos, { periodo: 'anual' })));
  it('mostra o preço do ano e o equivalente por mês', () => {
    expect(html).toContain('R$ 349,90/ano');
    expect(html).toContain('R$ 29,16/mês · economize 23%');
  });
});
