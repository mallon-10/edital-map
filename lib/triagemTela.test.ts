import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/assessoria', useRouter: () => ({}) }));

const { ResultadoAssessoria, TriagemAssessoria } = await import('@/components/assessoria/TriagemAssessoria');

const R = { cnpj: 'sim', licitacao: 'encontrei', ajuda: 'entender' } as const;
const fim = (p: Partial<typeof R> | object, numero: string | null = '5511987654321') =>
  renderToStaticMarkup(createElement(ResultadoAssessoria, { respostas: { ...R, ...p }, numero, edital: null, aoRefazer: () => undefined })).replace(/<!-- -->/g, '');
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('triagem', () => {
  it('abre na primeira pergunta, sem pedir dado pessoal', () => {
    const html = renderToStaticMarkup(createElement(TriagemAssessoria, { numero: '5511987654321', edital: null })).replace(/<!-- -->/g, '');
    expect(html).toContain('Pergunta 1 de 3');
    expect(html).toContain('Sua empresa já possui CNPJ ativo?');
    expect(html).not.toMatch(/<input|<textarea/);
  });
  it('vindo de um edital são duas perguntas, e o edital aparece', () => {
    const edital = { slug: '00394452000103-2026-1', titulo: 'Compra de luvas', orgao: 'Prefeitura', local: 'Joinville/SC', encerramento_em: null };
    const html = renderToStaticMarkup(createElement(TriagemAssessoria, { numero: null, edital })).replace(/<!-- -->/g, '');
    expect(html).toContain('Pergunta 1 de 2');
    expect(html).toContain('Compra de luvas');
  });
});

describe('resultado da triagem', () => {
  it('compatível: o serviço, o preço e o WhatsApp com as respostas', () => {
    const html = fim({});
    expect(html).toContain('a partir de R$ 197');
    expect(html).toContain('https://wa.me/5511987654321?text=');
    expect(html).toContain('confirmados antes');
  });
  it('sem CNPJ: avisa antes de abrir a conversa', () => {
    expect(fim({ cnpj: 'nao' })).toContain('costumam exigir CNPJ ativo');
  });
  it('quem procura editais vai à busca grátis e ao Pro, sem WhatsApp', () => {
    const html = fim({ licitacao: 'procurando' });
    expect(html).toContain('Pesquisar editais grátis');
    expect(html).toContain('href="/planos"');
    expect(html).toContain('href="/guias"');
    expect(html).not.toContain('wa.me');
  });
  it('execução completa: explica o limite e permite esclarecer, sem prometer', () => {
    const html = fim({ ajuda: 'terceirizar' });
    expect(html).toContain('orientação e preparação');
    expect(html).toContain('não enviamos proposta');
    expect(html).toContain('Esclarecer pelo WhatsApp');
    expect(html).not.toContain('a partir de R$ 197');
  });
  it('sem número configurado, a pessoa não fica sem saída', () => {
    expect(fim({}, null)).toContain('href="mailto:');
  });
  it('dá para refazer', () => {
    expect(fim({})).toContain('Refazer');
  });
});

describe('página /assessoria', () => {
  const p = ler('app/assessoria/page.tsx');
  it('mostra escopo e limites, e o edital vem do banco pelo endereço', () => {
    for (const t of ['ENTREGAVEIS_ASSESSORIA', 'LIMITES_ASSESSORIA', 'SLUG_EDITAL.test(', 'mostrarAssessoria(', 'numeroWhatsapp(']) expect(p, t).toContain(t);
  });
  it('com edital no endereço fica fora do Google', () => {
    expect(p).toContain('robots:');
  });
  it('WhatsApp conta em quer_recurso (painel do dono) e no GA4, sem contar duas vezes no banco', () => {
    const c = ler('components/assessoria/TriagemAssessoria.tsx');
    expect(c).toContain("registrar('quer_recurso'");
    expect(c).toContain("rastrear('assessoria_whatsapp_clicked'");
  });
});
