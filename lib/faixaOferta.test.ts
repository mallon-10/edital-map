import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FaixaOferta } from '@/components/FaixaOferta';

const html = renderToStaticMarkup(createElement(FaixaOferta)).replace(/<!-- -->/g, '');
const fonte = readFileSync(new URL('../components/FaixaOferta.tsx', import.meta.url), 'utf8');

describe('oferta do Pro (cartão abaixo do cabeçalho ou do cartão do topo)', () => {
  it('texto da oferta (e-mail é do Pro) e o convite para conhecer o Pro, levando a /planos', () => {
    expect(html).toContain('Pare de perder oportunidades de vender para o governo');
    expect(html).toContain('Alertas de novas oportunidades todos os dias às 7h e resumo semanal às segundas-feiras.');
    expect(html).not.toContain('toda semana');
    expect(html).toContain('Conhecer o Pro');
    expect(html.match(/href="\/planos"/g)).toHaveLength(1);
  });
  it('sem limite do dia nem bolinhas', () => {
    expect(html).not.toMatch(/Plano grátis|Renova|de 3|Buscas|Ver planos/);
  });
  it('fechar: botão de 44 px com nome, e o cartão some por uns dias (localStorage protegido)', () => {
    expect(html).toContain('aria-label="Fechar a oferta"');
    expect(html).toContain('size-11');
    expect(fonte).toContain('CHAVE_OFERTA_FECHADA');
    expect(fonte).toMatch(/try \{[\s\S]*localStorage[\s\S]*\} catch/);
  });
});
