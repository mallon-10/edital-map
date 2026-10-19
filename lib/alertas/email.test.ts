import { describe, expect, it } from 'vitest';
import { dataHora, moeda } from '../formato';
import { assunto, nomeProprio } from '../texto';
import { assuntoDoEmail, editalHtml, editalTexto, escapar, LOGO_EMAIL, linkEdital, linkSair, linkUmClique, moldura, montarEmail, prazoDoEmail, type EditalDoEmail, type SecaoEmail } from './email';

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
    expect(e.html).not.toContain('<img src=x');
    expect(e.html.match(/<img /g)).toHaveLength(1); // só o logo
    expect(e.html).toContain('&lt;img src=x');
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

describe('visual do e-mail (marca, pré-cabeçalho, botão e prazo)', () => {
  const AGORA = new Date('2026-10-20T12:00:00Z'); // 20.10, 9h em Brasília; ED encerra em 25.10 (5 dias)
  it('logo em PNG pelo endereço absoluto do site, com tamanho e alt; nenhuma outra imagem', () => {
    expect(LOGO_EMAIL).toBe('https://www.editalmap.com.br/marca/logo-email.png');
    const e = montarEmail({ secoes: [secao('EPI', [ED])], tokenSairTodos: 't', agora: AGORA });
    expect(e.html).toMatch(/<img [^>]*src="https:\/\/www\.editalmap\.com\.br\/marca\/logo-email\.png"[^>]*>/);
    const logo = e.html.match(/<img [^>]*>/)![0];
    for (const attr of ['width="180"', 'height="40"', 'alt="Edital Map"']) expect(logo).toContain(attr);
    const fontes = [...e.html.matchAll(/(?:src|background)="([^"]+)"/g)].map((m) => m[1]);
    expect(fontes).toEqual([LOGO_EMAIL]);
  });
  it('pré-cabeçalho escondido, com o texto escapado', () => {
    const html = moldura('<tr><td>x</td></tr>', 'rodapé', 'Olá <b>"EPI"</b>');
    expect(html).toMatch(/<div style="display:none;[^"]*"[^>]*>Olá &lt;b&gt;&quot;EPI&quot;&lt;\/b&gt;/);
    const e = montarEmail({ secoes: [secao('<i>EPI</i>', [ED])], tokenSairTodos: 't', agora: AGORA });
    expect(e.html).toMatch(/<div style="display:none;[^"]*"[^>]*>[^<]*&lt;i&gt;EPI&lt;\/i&gt;/);
    expect(e.html).not.toContain('<i>');
  });
  it('fontes da marca com reserva para quem bloqueia fonte da web', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED])], tokenSairTodos: 't', agora: AGORA });
    expect(e.html).toContain('fonts.googleapis.com/css2?family=Instrument+Sans');
    expect(e.html).toContain("'Instrument Sans',Arial,Helvetica");
    expect(e.html).toContain("'JetBrains Mono','Courier New'");
  });
  it('botão "Ver edital" leva à página do edital no site', () => {
    const html = editalHtml(ED, AGORA);
    const re = new RegExp(`<a href="${linkEdital(ED.slug).replace(/[.?]/g, '\\$&')}"[^>]*>Ver edital</a>`);
    expect(html).toMatch(re);
  });
  it('prazo: até 3 dias de calendário é urgente (laranja); depois, ouro', () => {
    const fim = (dias: number) => new Date(AGORA.getTime() + dias * 86_400_000).toISOString();
    expect(prazoDoEmail(fim(0.1), AGORA)).toMatchObject({ urgente: true, rotulo: 'Encerra hoje' });
    expect(prazoDoEmail(fim(1), AGORA)).toMatchObject({ urgente: true, rotulo: 'Encerra amanhã' });
    expect(prazoDoEmail(fim(3), AGORA)).toMatchObject({ urgente: true, rotulo: 'Encerra em 3 dias' });
    expect(prazoDoEmail(fim(4), AGORA)).toMatchObject({ urgente: false });
    expect(editalHtml({ ...ED, encerramento_em: fim(2) }, AGORA)).toContain('background:#ffe3d6');
    expect(editalHtml({ ...ED, encerramento_em: fim(2) }, AGORA)).toContain('Encerra em 2 dias');
    const longe = editalHtml(ED, AGORA);
    expect(longe).toContain('background:#fcefc2');
    expect(longe).not.toContain('#ffe3d6');
    expect(longe).toContain(`Propostas até ${dataHora(ED.encerramento_em)}`);
  });
  it('valor em JetBrains Mono; suspensa vira selo', () => {
    const html = editalHtml({ ...ED, situacao_id: 4 }, AGORA);
    expect(html).toMatch(/font-family:'JetBrains Mono'[^"]*"[^>]*>R\$/);
    expect(html).toMatch(/>Suspensa</);
  });
  it('seção: nome do alerta com a contagem de novos; links de gerenciar e explicação', () => {
    const e = montarEmail({ secoes: [secao('EPI', [ED, ED], 25), secao('Uniformes', [ED])], tokenSairTodos: 't', agora: AGORA });
    expect(e.html).toContain('25 editais novos');
    expect(e.html).toContain('1 edital novo');
    expect(e.html).toContain('href="https://www.editalmap.com.br/alertas"');
    expect(e.html).toContain('Gerenciar alertas');
    expect(e.html).toContain('Você recebe este e-mail porque criou alertas no Edital Map');
    expect(e.texto).toContain('EPI · 25 editais novos');
  });
  it('texto puro: prazo urgente diz quando encerra', () => {
    const fim = new Date(AGORA.getTime() + 86_400_000).toISOString();
    expect(editalTexto({ ...ED, encerramento_em: fim }, AGORA)).toContain('(Encerra amanhã)');
    expect(editalTexto(ED, AGORA)).not.toContain('Encerra');
  });
});
