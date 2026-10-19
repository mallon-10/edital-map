import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FaixaOferta } from '@/components/FaixaOferta';

const html = renderToStaticMarkup(createElement(FaixaOferta)).replace(/<!-- -->/g, '');

describe('faixa da oferta (abaixo do cabeçalho)', () => {
  it('texto da oferta (e-mail é do Pro) e o convite para conhecer o Pro', () => {
    expect(html).toContain('Receba no seu e-mail, toda semana, as licitações que combinam com o seu negócio');
    expect(html).toContain('Conhecer o Pro');
  });
  it('computador e celular levam a /planos', () => {
    expect(html.match(/href="\/planos"/g)).toHaveLength(2);
  });
  it('sem limite do dia nem bolinhas', () => {
    expect(html).not.toMatch(/Plano grátis|Renova|de 3|Buscas|Ver planos/);
  });
  it('celular: toque de 44 px e respeita a área segura', () => {
    expect(html).toContain('min-h-11');
    expect(html).toContain('env(safe-area-inset-left)');
  });
});
