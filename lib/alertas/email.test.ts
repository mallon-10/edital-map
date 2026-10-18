import { describe, expect, it } from 'vitest';
import { dataHora, moeda } from '../formato';
import { assunto, nomeProprio } from '../texto';
import { assuntoDoEmail, editalTexto, escapar, linkSair, linkUmClique, montarEmail, type EditalDoEmail, type SecaoEmail } from './email';

const ED: EditalDoEmail = {
  slug: '00394452000103-2026-21982', objeto: 'Aquisição de luvas nitrílicas para a Secretaria de Saúde', orgao_nome: 'PREFEITURA MUNICIPAL DE JOINVILLE',
  municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 1234.56, encerramento_em: '2026-10-25T17:00:00+00:00', situacao_id: 1,
};
const secao = (nome: string, editais: EditalDoEmail[], total = editais.length): SecaoEmail => ({ nome, editais, total, tokenSair: `tok-${nome}` });

describe('e-mail dos alertas', () => {
  it('assunto: um alerta ou vários', () => {
    expect(assuntoDoEmail([secao('EPI', [ED])])).toBe('1 edital novo para "EPI"');
    expect(assuntoDoEmail([secao('EPI', [ED, ED])])).toBe('2 editais novos para "EPI"');
    expect(assuntoDoEmail([secao('EPI', [ED]), secao('Uniformes', [ED, ED])])).toBe('3 editais novos nos seus alertas');
  });
  it('assunto numa linha só, mesmo com quebra ou controle no nome', () => {
    expect(assuntoDoEmail([secao('EPI\r\nBcc: x@y.z\t\u0000fim', [ED])])).toBe('1 edital novo para "EPI Bcc: x@y.z fim"');
  });
  it('cada edital: título limpo, órgão, município/UF, valor, prazo e link do site', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED])], tokenSairTodos: 'tok-todos' });
    for (const parte of [
      escapar(assunto(ED.objeto).titulo), escapar(nomeProprio(ED.orgao_nome)), 'Joinville/SC', escapar(moeda(1234.56)!),
      `Propostas até ${dataHora(ED.encerramento_em)}`, 'https://www.editalmap.com.br/edital/00394452000103-2026-21982',
    ]) {
      expect(e.html, parte).toContain(parte);
    }
    expect(e.texto).toContain(assunto(ED.objeto).titulo);
    expect(e.texto).toContain('https://www.editalmap.com.br/edital/00394452000103-2026-21982');
  });
  it('sem dado inventado: valor 0/nulo e município ausente', () => {
    const e = montarEmail({ secoes: [secao('EPI', [{ ...ED, valor_estimado: 0, municipio_nome: null }, { ...ED, valor_estimado: null }])], tokenSairTodos: 't' });
    expect(e.html.match(/Valor não informado/g)).toHaveLength(2);
    expect(e.html).toContain('Município não informado/SC');
  });
  it('suspensa aparece; texto do PNCP é escapado', () => {
    const e = montarEmail({ secoes: [secao('EPI', [{ ...ED, situacao_id: 4, objeto: 'Compra de <script>alert(1)</script> luvas' }])], tokenSairTodos: 't' });
    expect(e.html).toContain('Suspensa');
    expect(e.html).not.toContain('<script>');
  });
  it('nome do alerta e órgão com <, > e aspas saem escapados', () => {
    const e = montarEmail({ secoes: [secao('<b>"EPI"</b>', [{ ...ED, orgao_nome: 'Órgão "X" <img src=x onerror=alert(1)>' }])], tokenSairTodos: 't' });
    expect(e.html).not.toContain('<b>');
    expect(e.html).not.toContain('<img');
    expect(e.html).toContain('&lt;b&gt;&quot;EPI&quot;&lt;/b&gt;');
  });
  it('texto puro: título e órgão numa linha só', () => {
    const quebra = String.fromCharCode(13, 10);
    const t = editalTexto({ ...ED, objeto: 'Aquisição de luvas' + quebra + 'nitrílicas', orgao_nome: 'Prefeitura' + quebra + 'de Joinville' });
    expect(t.split(String.fromCharCode(10))).toHaveLength(4);
    expect(t).not.toContain(String.fromCharCode(13));
  });
  it('sobra: diz quantos ficam para o próximo e-mail', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED, ED], 25)], tokenSairTodos: 't' });
    expect(e.html).toContain('Mais 23 editais novos entram no próximo e-mail.');
    expect(e.texto).toContain('Mais 23 editais novos entram no próximo e-mail.');
  });
  it('descadastro: um por alerta, todos e cabeçalhos de um clique', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED]), secao('Uniformes', [ED])], tokenSairTodos: 'tok-todos' });
    expect(e.html).toContain(escapar(linkSair('tok-EPI')));
    expect(e.html).toContain(escapar(linkSair('tok-Uniformes')));
    expect(e.html).toContain('Parar de receber este alerta');
    expect(e.html).toContain('Parar todos os alertas');
    expect(e.html).toContain(escapar(linkSair('tok-todos')));
    expect(e.cabecalhos).toEqual({ 'List-Unsubscribe': `<${linkUmClique('tok-todos')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
    expect(linkUmClique('a.b c')).toBe('https://www.editalmap.com.br/api/descadastro?t=a.b%20c');
    expect(e.texto).toContain(linkSair('tok-todos'));
  });
});
