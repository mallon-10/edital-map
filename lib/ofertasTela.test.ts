import { readFileSync } from 'node:fs';
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CartaoAssessoria } from '@/components/edital/CartaoAssessoria';
import { CartaoMonitorar } from '@/components/edital/CartaoMonitorar';
import { ColunaLista } from '@/components/inicio/ColunaLista';
import { CartaoOfertaBusca } from '@/components/inicio/OfertaBusca';
import { ofertaDaBusca } from './ofertaBusca';
import type { FiltrosTela } from './tipos';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const limpo = (h: string) => h.replace(/<!-- -->/g, '');
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const nada = () => undefined;

function lista(extra: object) {
  const props = {
    resultado: { total: 0, editais: [] }, agora: new Date(), filtros: VAZIO, carregandoLista: false, erro: null, erroExportar: null, carregandoMais: false, erroMais: null,
    ordem: 'relevancia', temTermo: true, listaRef: createRef<HTMLDivElement>(), aoRolar: nada, aoTirarCidade: nada, aoSelecionar: nada, aoMudarPrazo: nada, aoMudarOrdem: nada,
    aoCarregarMais: nada, aoRecomecar: nada, aoAplicar: nada, ...extra,
  };
  return limpo(renderToStaticMarkup(createElement(ColunaLista, props as never)));
}

describe('resposta da busca', () => {
  it('enquanto busca: diz que está buscando e mostra cartões animados no lugar da lista', () => {
    const html = lista({ carregandoLista: true, confirmacao: 'antigo' });
    expect(html).toContain('Buscando editais…');
    expect(html).not.toContain('antigo');
    expect(html.match(/data-esqueleto/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('animate-pulse');
    expect(html).toContain('motion-reduce:animate-none');
  });
  it('terminou: confirma com a contagem e o termo, com animação de entrada', () => {
    const html = lista({ confirmacao: '286 editais encontrados para uniformes', resultado: { total: 286, editais: [] } });
    expect(html).toContain('286 editais encontrados para uniformes');
    expect(html).toContain('role="status"');
    expect(html).toContain('animate-entrar');
    expect(html).not.toContain('data-esqueleto');
  });
  it('a oferta vem antes dos editais, logo depois da confirmação', () => {
    const html = lista({ confirmacao: 'C', oferta: createElement('p', null, 'OFERTA'), resultado: { total: 1, editais: [] } });
    expect(html.indexOf('>C<')).toBeLessThan(html.indexOf('OFERTA'));
    expect(html.indexOf('OFERTA')).toBeLessThan(html.indexOf('>Editais<'));
  });
  it('quem busca é levado à lista: campo, assunto, CNPJ e folha de filtros', () => {
    const e = ler('components/Explorador.tsx');
    expect(e.match(/\{ rolar: true \}/g)?.length).toBeGreaterThanOrEqual(4);
    expect(e).toContain('scrollIntoView');
    expect(e).toContain('oferta={');
  });
  it('a rolagem espera a tela se reorganizar: a faixa geral sai do topo na mesma hora e mudaria o destino', () => {
    const e = ler('components/Explorador.tsx');
    expect(e).toContain('rolarDepois.current = true');
    const efeito = e.slice(e.indexOf('if (!rolarDepois.current) return;'));
    expect(efeito.slice(0, 300)).toContain('scrollIntoView');
    const aplicar = e.slice(e.indexOf('function aplicar('), e.indexOf('function escolherCidade'));
    expect(aplicar).not.toContain('scrollIntoView');
    expect(e.indexOf('oferta={')).toBeGreaterThan(e.indexOf('<ColunaLista'));
  });
  it('a lupa do celular gira enquanto busca, parada com movimento reduzido', () => {
    const b = ler('components/inicio/BuscaPrincipal.tsx');
    expect(b).toContain('IconeGiro');
    expect(b).toContain('motion-reduce:animate-none');
  });
  it('a animação de entrada existe no tema', () => {
    const g = ler('app/globals.css');
    expect(g).toContain('--animate-entrar');
    expect(g).toContain('@keyframes entrar');
  });
});

describe('cartão da oferta depois da busca', () => {
  const oferta = ofertaDaBusca({ ...VAZIO, q: 'uniforme' }, 281)!;
  const html = limpo(renderToStaticMarkup(createElement(CartaoOfertaBusca, { oferta, segmento: 'uniforme', total: 281, aoFechar: nada })));
  it('destaque: fundo azul-escuro, entra com animação', () => {
    expect(html).toContain('bg-ink');
    expect(html).toContain('animate-entrar');
  });
  it('preço visível e só benefícios reais', () => {
    expect(html).toContain('R$ 37,90/mês');
    for (const t of ['Todo dia às 7h', 'Só editais novos', 'Cancele quando quiser']) expect(html, t).toContain(t);
  });
  it('chamada e saída', () => {
    expect(html).toContain('Receber novos editais deste segmento');
    expect(html).toContain('Continuar pesquisando grátis');
    expect(html).toContain('aria-label="Fechar a oferta"');
  });
});

describe('cartões do edital', () => {
  const assessoria = limpo(renderToStaticMarkup(createElement(CartaoAssessoria, { href: '/assessoria?edital=x', edital: 'x', id: 'b' })));
  it('assessoria curta, com preço, sem lista de itens', () => {
    expect(assessoria).toContain('Quero orientação para este edital');
    expect(assessoria).toContain('a partir de R$ 197');
    expect(assessoria).not.toContain('<ul');
  });
  it('monitorar em destaque para quem não assina; sem venda para o Pro', () => {
    const gratis = limpo(renderToStaticMarkup(createElement(CartaoMonitorar, { href: '/alertas/novo', segmento: null, preco: 'R$ 37,90/mês' })));
    const pro = limpo(renderToStaticMarkup(createElement(CartaoMonitorar, { href: '/alertas/novo', segmento: null, preco: null })));
    expect(gratis).toContain('bg-ink');
    expect(gratis).toContain('R$ 37,90/mês');
    expect(pro).not.toContain('bg-ink');
    expect(pro).not.toContain('R$');
  });
  it('o botão verde forte volta, só no celular: ali as ofertas ficam fora da primeira tela', () => {
    const c = ler('components/edital/CartaoAssessoria.tsx');
    const botao = c.slice(c.indexOf('export function BotaoAssessoria'), c.indexOf('/** Oferta da assessoria'));
    expect(botao).toContain('bg-mata ');
    expect(botao).toContain('lg:hidden');
  });
});
