import { readdirSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConteudoPlanos } from '@/components/planos/ConteudoPlanos';
import { DIFERENCAS, INCLUIDO_NOS_DOIS, PERGUNTAS } from './paginaPlanos';
import { AVISO_PLANOS, type Periodo, type Plano } from './planos';

const sem = (html: string) => html.replace(/<!-- -->/g, '').replace(/&quot;/g, '"');
const tela = (p: { pagamento: boolean; atual: Plano; periodo?: Periodo }) =>
  sem(renderToStaticMarkup(createElement(ConteudoPlanos, { pagamento: p.pagamento, atual: p.atual, periodoInicial: p.periodo })));
const contar = (html: string, trecho: string) => html.split(trecho).length - 1;

describe('fronteira servidor/navegador', () => {
  it("arquivos 'use client' da página só exportam componentes (o servidor não pode chamar função deles)", () => {
    const pasta = new URL('../components/planos/', import.meta.url);
    for (const nome of readdirSync(pasta)) {
      const texto = readFileSync(new URL(nome, pasta), 'utf8');
      if (!texto.startsWith("'use client'")) continue;
      const exportados = [...texto.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
      for (const e of exportados) expect(e, `${nome}: ${e}`).toMatch(/^[A-Z]|^use[A-Z]/);
    }
  });
});

describe('página de planos: grátis com o pagamento ligado', () => {
  const html = tela({ pagamento: true, atual: 'gratis' });
  it('um h1 só, com o título aprovado', () => {
    expect(contar(html, '<h1')).toBe(1);
    expect(html).toContain('Sua próxima oportunidade');
  });
  it('três chamadas para o checkout no mensal: a do topo fala do benefício', () => {
    expect(contar(html, 'href="/assinar?periodo=mensal"')).toBe(3);
    expect(html).not.toContain('/assinar?periodo=anual');
    expect(contar(html, '>Começar a receber oportunidades<')).toBe(1);
    expect(contar(html, '>Assinar o Pro<')).toBe(2);
  });
  it('confiança e a assessoria como serviço à parte', () => {
    expect(html).toContain('Fonte oficial: PNCP');
    expect(html).toContain('href="/assessoria"');
    expect(html).toContain('a partir de R$ 197');
  });
  it('Grátis discreto com "Continuar grátis"; Pro recomendado com a âncora #pro; seção #precos', () => {
    expect(html).toContain('Continuar grátis');
    expect(html).toContain('Recomendado');
    expect(html).toMatch(/id="pro"/);
    expect(html).toMatch(/id="precos"/);
    expect(html).toContain('href="#precos"');
  });
  it('alternador acessível, Mensal marcado, sem "2 meses grátis"', () => {
    expect(html).toContain('role="radiogroup"');
    expect(html).toMatch(/aria-checked="true"[^>]*>Mensal/);
    expect(html).toContain('−23%');
    expect(html).not.toMatch(/2 meses/);
    expect(html).toContain('R$ 37,90');
    expect(html).toContain('Cobrado todo mês. Cancele quando quiser.');
  });
  it('e-mail ilustrativo sinalizado', () => {
    expect(html).toContain('Exemplo ilustrativo');
  });
  it('quem já assinou entra com o e-mail da compra', () => {
    expect(html).toContain('href="/entrar?voltar=/assinatura"');
  });
  it('comparação compacta e o que os dois têm num bloco que abre e fecha', () => {
    for (const d of DIFERENCAS) expect(html).toContain(d.recurso);
    for (const i of INCLUIDO_NOS_DOIS) expect(html).toContain(i);
    expect(html).toContain('Incluído nos dois planos');
    expect(html).toContain('Em preparação');
  });
  it('todas as perguntas, cada uma num details', () => {
    for (const p of PERGUNTAS) expect(html).toContain(p.pergunta);
    expect(contar(html, '<details')).toBe(PERGUNTAS.length + 1);
  });
  it('chamada final', () => {
    expect(html).toContain('Pare de perder oportunidades');
    expect(html).toContain('de vender para o governo.');
  });
});

describe('página de planos no anual', () => {
  const html = tela({ pagamento: true, atual: 'gratis', periodo: 'anual' });
  it('cobrança por ano em destaque, o equivalente e a economia; checkout no anual', () => {
    expect(html).toContain('R$ 349,90');
    expect(html).toContain('/ano');
    expect(html).toContain('Equivale a R$ 29,16/mês');
    expect(html).toContain('cerca de 23% a menos que 12 mensalidades (R$ 454,80)');
    expect(contar(html, 'href="/assinar?periodo=anual"')).toBe(3);
  });
});

describe('página de planos com o pagamento desligado', () => {
  const html = tela({ pagamento: false, atual: 'gratis' });
  it('lista de espera no lugar do checkout', () => {
    expect(html).not.toContain('/assinar');
    expect(contar(html, 'Quero o Pro')).toBe(3);
    expect(html).toContain(AVISO_PLANOS);
  });
});

describe('página de planos para quem já é Pro', () => {
  for (const atual of ['pro', 'basic'] as const) {
    const html = tela({ pagamento: true, atual });
    it(`${atual}: "Seu plano hoje", leva aos alertas e à assinatura; sem checkout nem "Continuar grátis"`, () => {
      expect(html).toContain('Seu plano hoje');
      expect(html).toContain('href="/alertas"');
      expect(html).toContain('href="/assinatura"');
      expect(html).not.toContain('/assinar');
      expect(html).not.toContain('Continuar grátis');
      expect(html).not.toContain('Já assinou?');
    });
  }
});
