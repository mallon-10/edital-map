import { readdirSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CabecalhoCheckout } from '@/components/pagamento/CabecalhoCheckout';
import { CheckoutPro } from '@/components/pagamento/CheckoutPro';
import { CartaoEsperando, CartaoNaoEncontrado, CartaoPago } from '@/components/pagamento/Obrigado';
import { TelaPix } from '@/components/pagamento/TelaPix';
import { ITENS_PRO } from './paginaPlanos';
import type { Periodo } from './planos';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));

const sem = (html: string) => html.replace(/<!-- -->/g, '').replace(/&quot;/g, '"');
const checkout = (periodo: Periodo) => sem(renderToStaticMarkup(createElement(CheckoutPro, { clienteId: 'x', periodoInicial: periodo })));
const contar = (html: string, trecho: string) => html.split(trecho).length - 1;
/** Rádio `nome`=`valor` marcado, seja qual for a ordem dos atributos. */
const marcado = (html: string, nome: string, valor: string) =>
  [...html.matchAll(/<input[^>]*>/g)].some(([t]) => t.includes(`name="${nome}"`) && t.includes(`value="${valor}"`) && t.includes('checked=""'));

describe('fronteira servidor/navegador', () => {
  it("arquivos 'use client' do checkout só exportam componentes", () => {
    const pasta = new URL('../components/pagamento/', import.meta.url);
    for (const nome of readdirSync(pasta)) {
      const texto = readFileSync(new URL(nome, pasta), 'utf8');
      if (!texto.startsWith("'use client'")) continue;
      const exportados = [...texto.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
      for (const e of exportados) expect(e, `${nome}: ${e}`).toMatch(/^[A-Z]|^use[A-Z]/);
    }
  });
});

describe('checkout: mensal, Pix marcado', () => {
  const html = checkout('mensal');
  it('um h1, "Assinar o Pro", e o caminho de volta aos planos', () => {
    expect(contar(html, '<h1')).toBe(1);
    expect(html).toMatch(/<h1[^>]*>Assinar o Pro<\/h1>/);
    expect(html).toMatch(/href="\/planos"[^>]*>.*Voltar aos planos/);
  });
  it('período e forma de pagamento em rádios nativos, mensal e Pix marcados', () => {
    expect(marcado(html, 'periodo', 'mensal')).toBe(true);
    expect(marcado(html, 'metodo', 'pix')).toBe(true);
    expect(marcado(html, 'periodo', 'anual')).toBe(false);
    expect(marcado(html, 'metodo', 'cartao')).toBe(false);
    expect(html).toContain('−23%');
  });
  it('dois passos numerados e os campos com exemplo', () => {
    expect(html).toContain('Seus dados');
    expect(html).toContain('Forma de pagamento');
    expect(html).toContain('placeholder="(11) 98765-4321"');
    expect(html).toContain('É com ele que você entra e recebe os alertas.');
  });
  it('campos de texto com letra de 16 px (o iPhone não dá zoom)', () => {
    const campos = [...html.matchAll(/<input(?![^>]*type="radio")[^>]*>/g)].map((m) => m[0]);
    expect(campos.length).toBeGreaterThan(3);
    for (const c of campos) expect(c).toContain('text-[16px]');
  });
  it('Pix mostra os três passos; o cartão não aparece', () => {
    expect(html).toContain('Gere o QR Code');
    expect(html).toContain('Autorize no banco');
    expect(html).not.toContain('Número do cartão');
  });
  it('botão com a forma de pagamento e o valor', () => {
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>.*Assinar com Pix · R\$ 37,90<\/button>/);
    expect(html).toContain('Na próxima tela aparece o QR Code para autorizar no app do banco.');
  });
  it('resumo do pedido com o que vem no Pro, o total e quem já assinou', () => {
    expect(html).toContain('Resumo do pedido');
    for (const i of ITENS_PRO) expect(html).toContain(i);
    expect(html).toContain('Total hoje');
    expect(html).toContain('Depois, R$ 37,90 por mês, até você cancelar.');
    expect(html).toContain('Pagamento seguro, processado pela Cakto');
    expect(html).toContain('href="/entrar?voltar=/assinatura"');
  });
});

describe('checkout: anual', () => {
  const html = checkout('anual');
  it('anual marcado, equivalente por mês e o botão com o valor do ano', () => {
    expect(marcado(html, 'periodo', 'anual')).toBe(true);
    expect(html).toContain('Equivale a R$ 29,16/mês');
    expect(html).toContain('Assinar com Pix · R$ 349,90');
    expect(html).toContain('Depois, R$ 349,90 por ano, até você cancelar.');
  });
});

describe('tela do Pix', () => {
  const tela = (expiraEm: string | null) =>
    sem(
      renderToStaticMarkup(
        createElement(TelaPix, {
          pix: { codigo: 'c1', qrCode: '000201pix', imagem: 'data:image/png;base64,x', expiraEm },
          valor: 'R$ 37,90',
          unidade: 'mês',
          aoPagarComCartao: () => undefined,
        }),
      ),
    );
  const html = tela('2026-10-22T17:32:00Z');
  it('QR, código para copiar e passos', () => {
    expect(html).toContain('alt="QR Code do Pix Automático"');
    expect(html).toContain('value="000201pix"');
    expect(html).toContain('Copiar código Pix');
    expect(html).toContain('A primeira cobrança é de R$ 37,90');
  });
  it('validade do código só quando a Cakto manda', () => {
    expect(html).toContain('O código vale até 14h32');
    expect(tela(null)).not.toContain('O código vale até');
  });
  it('espera visível e saída para o cartão', () => {
    expect(html).toMatch(/role="status"[^>]*>.*Esperando a confirmação do banco/);
    expect(html).toContain('Pagar com cartão de crédito');
  });
});

describe('cabeçalho do checkout e /obrigado', () => {
  it('cabeçalho enxuto: logo e pagamento seguro, sem abas', () => {
    const html = sem(renderToStaticMarkup(createElement(CabecalhoCheckout)));
    expect(html).toContain('Pagamento seguro');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('Meu Radar');
  });
  it('pago: Pro ativo, quadro do plano e o próximo passo com o e-mail', () => {
    const html = sem(
      renderToStaticMarkup(
        createElement(CartaoPago, { periodo: 'mensal', validoAte: '2026-11-22T15:00:00Z', email: 'maria@empresa.com.br', entrar: '/entrar?x=1' }),
      ),
    );
    expect(html).toContain('Pronto, o Pro está ativo');
    expect(html).toContain('Pro mensal');
    expect(html).toContain('R$ 37,90/mês');
    expect(html).toContain('22.11.2026');
    expect(html).toContain('maria@empresa.com.br');
    // O próximo passo é o e-mail: o código de ativação foi para o e-mail da compra.
    expect(html).toContain('Último passo: ative sua conta pelo seu e-mail');
    expect(html).toMatch(/Enviamos para .*maria@empresa\.com\.br.* um e-mail com o código de ativação/);
    expect(html).toContain('Confira também o spam');
    expect(html).toMatch(/href="\/entrar\?x=1"[^>]*>.*Já recebi o código/);
    expect(html).toContain('Ou buscar editais agora');
  });
  it('pago em outro navegador (sem o e-mail): fala do e-mail da compra', () => {
    const html = sem(renderToStaticMarkup(createElement(CartaoPago, { periodo: 'anual', validoAte: '2027-10-22T15:00:00Z', email: null, entrar: '/entrar' })));
    expect(html).toContain('Enviamos para o e-mail da compra um e-mail com o código de ativação');
  });
  it('esperando e não encontrado', () => {
    expect(sem(renderToStaticMarkup(createElement(CartaoEsperando, { codigo: 'c1' })))).toContain('Recebemos seu pedido');
    expect(sem(renderToStaticMarkup(createElement(CartaoNaoEncontrado)))).toContain('Não encontramos este pedido');
  });
});
