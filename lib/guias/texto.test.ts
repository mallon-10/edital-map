import { describe, expect, it } from 'vitest';
import { ehOficial, linksDoTexto, palavras, pedacos } from './texto';

describe('pedacos', () => {
  it('texto sem link', () => {
    expect(pedacos('Sem link aqui.')).toEqual([{ tipo: 'texto', texto: 'Sem link aqui.' }]);
  });
  it('link interno e link oficial', () => {
    expect(pedacos('Veja o [pregão](/guias/pregao-eletronico) e a [lei](https://www.planalto.gov.br/l14133.htm).')).toEqual([
      { tipo: 'texto', texto: 'Veja o ' },
      { tipo: 'link', texto: 'pregão', href: '/guias/pregao-eletronico', externo: false },
      { tipo: 'texto', texto: ' e a ' },
      { tipo: 'link', texto: 'lei', href: 'https://www.planalto.gov.br/l14133.htm', externo: true },
      { tipo: 'texto', texto: '.' },
    ]);
  });
  it('domínio não oficial e endereço sem https viram texto', () => {
    expect(pedacos('[blog](https://exemplo.com.br/x) e [x](http://www.gov.br)')).toEqual([{ tipo: 'texto', texto: 'blog e x' }]);
  });
});

describe('linksDoTexto', () => {
  it('só os internos', () => {
    expect(linksDoTexto('[a](/glossario/edital) [b](https://www.gov.br/x) [c](/licitacoes/sp)')).toEqual(['/glossario/edital', '/licitacoes/sp']);
  });
});

describe('ehOficial', () => {
  it('domínios oficiais e subdomínios; imitação não', () => {
    expect(ehOficial('https://www.gov.br/compras/pt-br')).toBe(true);
    expect(ehOficial('https://pncp.gov.br/app/editais')).toBe(true);
    expect(ehOficial('https://www.planalto.gov.br/ccivil_03/x.htm')).toBe(true);
    expect(ehOficial('https://portal.tcu.gov.br/x')).toBe(true);
    expect(ehOficial('https://gov.br.exemplo.com/x')).toBe(false);
    expect(ehOficial('http://www.gov.br/x')).toBe(false);
    expect(ehOficial('não é url')).toBe(false);
  });
});

describe('palavras', () => {
  it('conta palavras do texto visível (sem a parte do endereço dos links)', () => {
    expect(palavras('Uma frase com [quatro palavras](/x) aqui.')).toBe(6);
    expect(palavras('  ')).toBe(0);
  });
});
