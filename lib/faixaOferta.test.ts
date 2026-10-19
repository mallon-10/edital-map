import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FaixaOferta } from '@/components/FaixaOferta';

const html = renderToStaticMarkup(createElement(FaixaOferta)).replace(/<!-- -->/g, '');

describe('faixa da oferta (abaixo do cabeçalho)', () => {
  it('texto da oferta e o convite para criar o radar', () => {
    expect(html).toContain('Receba no seu e-mail as licitações que combinam com o seu negócio');
    expect(html).toContain('Criar meu radar grátis');
  });
  it('computador e celular levam a /radar/comecar', () => {
    expect(html.match(/href="\/radar\/comecar"/g)).toHaveLength(2);
  });
  it('sem limite do dia nem bolinhas', () => {
    expect(html).not.toMatch(/Plano grátis|Renova|de 3|Buscas|Ver planos/);
  });
  it('celular: toque de 44 px e respeita a área segura', () => {
    expect(html).toContain('min-h-11');
    expect(html).toContain('env(safe-area-inset-left)');
  });
});
