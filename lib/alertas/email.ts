import { dataHora, diasAte, moeda } from '../formato';
import { url } from '../seo/site';
import { rotuloSituacao } from '../situacao';
import { assunto as assuntoDoObjeto, nomeProprio } from '../texto';

/**
 * E-mail dos alertas (Fase 4, §3): um por conta, uma seção por alerta, até 20 editais por alerta. Só o que veio do PNCP,
 * limpo por lib/texto.ts e escapado (o nome do alerta também); valor nulo ou 0 = "Valor não informado". Links absolutos
 * para o site; descadastro por alerta, de todos e de um clique (List-Unsubscribe). Puro: o job monta, o Resend envia.
 * Visual da marca (o mesmo do resumo e do e-mail do código, supabase/templates/codigo.html): tabelas, estilos em linha,
 * só a imagem do logo do próprio site, nada de pixel de rastreio.
 */

export const REMETENTE_ALERTAS = 'Edital Map <alertas@editalmap.com.br>';

export type EditalDoEmail = {
  slug: string;
  objeto: string;
  orgao_nome: string;
  municipio_nome: string | null;
  uf: string;
  valor_estimado: number | string | null;
  encerramento_em: string;
  situacao_id: number | null;
};
export type SecaoEmail = { nome: string; editais: EditalDoEmail[]; total: number; tokenSair: string };
export type EmailMontado = { assunto: string; html: string; texto: string; cabecalhos: Record<string, string> };

export function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Texto numa linha só (assunto, títulos do texto puro): sem quebras nem caracteres de controle, espaços juntados. */
const CONTROLES = /[\x00-\x1f\x7f-\x9f]+/g; // o \s abaixo cobre U+2028/U+2029
export function umaLinha(t: string): string {
  return t.replace(CONTROLES, ' ').replace(/\s+/g, ' ').trim();
}

export const linkSair = (token: string) => url(`/alertas/sair?t=${encodeURIComponent(token)}`);
export const linkUmClique = (token: string) => url(`/api/descadastro?t=${encodeURIComponent(token)}`);
export const linkEdital = (slug: string) => url(`/edital/${encodeURIComponent(slug)}`);

/** Cabeçalhos de descadastro de um clique (RFC 8058). Só o link (token codificado), nada escrito pelo usuário. */
export function cabecalhosDescadastro(token: string): Record<string, string> {
  return { 'List-Unsubscribe': `<${linkUmClique(token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

/* ---------- Marca (a mesma do site: app/globals.css e components/Logo.tsx) ---------- */

/** Logo em PNG (cliente de e-mail não mostra SVG): gerado por scripts/gerar-logo-email.mjs, 360×80 para 180×40. */
export const LOGO_EMAIL = url('/marca/logo-email.png');

export const COR = {
  ink: '#0c2340',
  inkMuted: '#3e5373',
  pin: '#ff5a1f',
  pinStrong: '#b33a0e',
  pinSoft: '#ffe3d6',
  surface: '#f4f1e8',
  raised: '#ffffff',
  sunken: '#ebe6d9',
  line: '#ddd6c6',
  mata: '#0b6b53',
  mataSoft: '#ddf1e9',
  ouroStrong: '#7a5600',
  ouroSoft: '#fcefc2',
} as const;

/** Fontes da marca com reserva: o Gmail bloqueia fonte da web, então o e-mail tem de ficar bom em Arial e Courier. */
export const FONTE = "'Instrument Sans',Arial,Helvetica,system-ui,sans-serif";
export const MONO = "'JetBrains Mono','Courier New',Courier,monospace";
const LINK_FONTES = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&amp;family=JetBrains+Mono:wght@500;700&amp;display=swap';

/** Botão à prova de cliente (tabela com fundo + link com preenchimento): laranja com texto azul-marinho, como no site. */
export function botao(href: string, rotulo: string, tamanho: 'normal' | 'grande' = 'normal'): string {
  const pad = tamanho === 'grande' ? '14px 26px' : '9px 16px';
  const fs = tamanho === 'grande' ? 16 : 14;
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${COR.pin}" style="background:${COR.pin};border-radius:8px;">` +
    `<a href="${escapar(href)}" style="display:inline-block;padding:${pad};font-family:${FONTE};font-size:${fs}px;line-height:1.2;font-weight:700;color:${COR.ink};text-decoration:none;border-radius:8px;">${escapar(rotulo)}</a>` +
    `</td></tr></table>`
  );
}

/* ---------- Edital ---------- */

export type PrazoDoEmail = { urgente: boolean; rotulo: string };

/**
 * Pílula do prazo: até 3 dias de calendário de Brasília é urgente (laranja), depois ouro. O rótulo só diz o que a data
 * diz ("Encerra hoje", "amanhã", "em N dias"); a data e a hora exatas vão sempre junto ("Propostas até …").
 */
export function prazoDoEmail(encerramento: string, agora: Date): PrazoDoEmail {
  if (Date.parse(encerramento) <= agora.getTime()) return { urgente: true, rotulo: 'Prazo encerrado' };
  const d = diasAte(encerramento, agora);
  const rotulo = d <= 0 ? 'Encerra hoje' : d === 1 ? 'Encerra amanhã' : `Encerra em ${d} dias`;
  return { urgente: d <= 3, rotulo };
}

export type LinhaEdital = { titulo: string; orgao: string; local: string; valor: string; prazo: string; situacao: string | null; link: string };

export function linhaDoEdital(e: EditalDoEmail): LinhaEdital {
  return {
    titulo: assuntoDoObjeto(e.objeto).titulo,
    orgao: nomeProprio(e.orgao_nome),
    local: `${e.municipio_nome ?? 'Município não informado'}/${e.uf}`,
    valor: moeda(e.valor_estimado) ?? 'Valor não informado',
    prazo: `Propostas até ${dataHora(e.encerramento_em)}`,
    situacao: rotuloSituacao(e.situacao_id) === 'Suspensa' ? 'Suspensa' : null,
    link: linkEdital(e.slug),
  };
}

/** Pílula (prazo, selo). `conteudo` já vem escapado. */
const pilula = (conteudo: string, fundo: string, cor: string, peso = 600) =>
  `<span style="display:inline-block;margin:0 6px 4px 0;padding:4px 10px;border-radius:999px;background:${fundo};color:${cor};font-family:${FONTE};font-size:12px;line-height:1.35;font-weight:${peso};">${conteudo}</span>`;

/** Card de um edital (alertas e resumo): pílula do prazo e selo da situação, título, órgão e local, valor em mono, botão. */
export function editalHtml(e: EditalDoEmail, agora: Date = new Date()): string {
  const l = linhaDoEdital(e);
  const p = prazoDoEmail(e.encerramento_em, agora);
  const prazo = p.urgente
    ? pilula(`<strong>${escapar(p.rotulo)}</strong> · ${escapar(l.prazo)}`, COR.pinSoft, COR.pinStrong)
    : pilula(escapar(l.prazo), COR.ouroSoft, COR.ouroStrong);
  const selo = l.situacao ? pilula(escapar(l.situacao), COR.sunken, COR.pinStrong, 700) : '';
  const semValor = l.valor === 'Valor não informado';
  const valor = `<span style="font-family:${MONO};font-size:${semValor ? 13 : 16}px;line-height:1.4;font-weight:${semValor ? 500 : 700};color:${semValor ? COR.inkMuted : COR.ink};text-transform:none;letter-spacing:0;">${escapar(l.valor)}</span>`;
  return `<tr><td style="padding:0 0 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COR.line};border-radius:10px;background:${COR.raised};">
<tr><td class="em-card" style="padding:16px 18px;font-family:${FONTE};">
<div style="margin:0 0 6px;">${prazo}${selo}</div>
<a href="${escapar(l.link)}" style="font-family:${FONTE};font-size:16px;line-height:1.35;font-weight:700;color:${COR.ink};text-decoration:none;">${escapar(l.titulo)}</a>
<div style="margin-top:6px;font-family:${FONTE};font-size:13px;line-height:1.45;color:${COR.inkMuted};">${escapar(l.orgao)}<br>${escapar(l.local)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>
<td valign="bottom" style="padding-right:8px;font-family:${MONO};font-size:10px;line-height:1.5;color:${COR.inkMuted};text-transform:uppercase;letter-spacing:0.08em;">Valor estimado<br>${valor}</td>
<td valign="bottom" align="right" width="112">${botao(l.link, 'Ver edital')}</td>
</tr></table>
</td></tr></table>
</td></tr>`;
}

export function editalTexto(e: EditalDoEmail, agora: Date = new Date()): string {
  const l = linhaDoEdital(e);
  const p = prazoDoEmail(e.encerramento_em, agora);
  return [
    `- ${umaLinha(l.titulo)}${l.situacao ? ` (${l.situacao})` : ''}`,
    `  ${umaLinha(l.orgao)} · ${umaLinha(l.local)}`,
    `  ${l.valor} · ${l.prazo}${p.urgente ? ` (${p.rotulo})` : ''}`,
    `  ${l.link}`,
  ].join('\n');
}

/* ---------- Moldura ---------- */

/** Título de seção dentro do cartão, com um detalhe opcional em mono (contagem). */
export function tituloSecao(titulo: string, detalhe?: string): string {
  const d = detalhe
    ? `<div style="margin-top:4px;font-family:${MONO};font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.02em;color:${COR.pinStrong};">${escapar(detalhe)}</div>`
    : '';
  return `<h2 style="margin:0;font-family:${FONTE};font-size:19px;line-height:1.3;font-weight:700;color:${COR.ink};">${escapar(titulo)}</h2>${d}`;
}

/** Abertura do cartão: sobretítulo em mono, título e uma frase. Tudo escapado aqui. */
export function abertura(sobretitulo: string, titulo: string, frase: string): string {
  return `<tr><td class="em-px" style="padding:26px 28px 6px;font-family:${FONTE};">
<div style="font-family:${MONO};font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${COR.pinStrong};">${escapar(sobretitulo)}</div>
<div style="margin-top:6px;font-family:${FONTE};font-size:23px;line-height:1.25;font-weight:700;color:${COR.ink};">${escapar(titulo)}</div>
<div style="margin-top:8px;font-family:${FONTE};font-size:14px;line-height:1.5;color:${COR.inkMuted};">${escapar(frase)}</div>
</td></tr>`;
}

/** Link do rodapé (descadastro, gerenciar). */
export const linkRodape = (href: string, rotulo: string) => `<a href="${escapar(href)}" style="color:${COR.inkMuted};text-decoration:underline;">${escapar(rotulo)}</a>`;

/**
 * Moldura comum (alertas e resumo): pré-cabeçalho escondido, logo no creme, cartão branco com o fio laranja em cima e o
 * rodapé fora do cartão. `conteudo` (linhas <tr>) e `rodape` já vêm escapados; o pré-cabeçalho é escapado aqui.
 */
export function moldura(conteudo: string, rodape: string, preCabecalho = ''): string {
  const pre = preCabecalho
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapar(umaLinha(preCabecalho))}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>\n`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<link href="${LINK_FONTES}" rel="stylesheet">
<style>
:root { color-scheme: light only; supported-color-schemes: light only; }
@media (max-width: 620px) {
  .em-px { padding-left: 18px !important; padding-right: 18px !important; }
  .em-card { padding: 14px !important; }
}
@media (max-width: 480px) {
  .em-col { display: block !important; width: 100% !important; box-sizing: border-box; padding: 0 0 8px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${COR.surface};color:${COR.ink};font-family:${FONTE};-webkit-text-size-adjust:100%;">
${pre}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.surface}" style="background:${COR.surface};">
<tr><td align="center" style="padding:24px 10px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:4px 6px 18px;"><a href="${escapar(url('/'))}" style="text-decoration:none;"><img src="${escapar(LOGO_EMAIL)}" width="180" height="40" alt="Edital Map" style="display:block;border:0;outline:none;width:180px;height:40px;font-family:${FONTE};font-size:20px;font-weight:700;color:${COR.ink};"></a></td></tr>
<tr><td bgcolor="${COR.raised}" style="background:${COR.raised};border:1px solid ${COR.line};border-top:4px solid ${COR.pin};border-radius:12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${conteudo}
</table>
</td></tr>
<tr><td class="em-px" style="padding:20px 8px 0;font-family:${FONTE};font-size:12px;line-height:1.6;color:${COR.inkMuted};">${rodape}</td></tr>
<tr><td style="padding:14px 8px 0;font-family:${MONO};font-size:11px;line-height:1.5;letter-spacing:0.02em;color:${COR.inkMuted};">Edital Map · licitações abertas no mapa · <a href="${escapar(url('/'))}" style="color:${COR.inkMuted};text-decoration:none;">www.editalmap.com.br</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ---------- E-mail dos alertas ---------- */

const textoSobra = (s: SecaoEmail) => `Mais ${plural(s.total - s.editais.length, 'edital novo entra', 'editais novos entram')} no próximo e-mail.`;
const contagemSecao = (s: SecaoEmail) => plural(s.total, 'edital novo', 'editais novos');

function secaoHtml(s: SecaoEmail, i: number, agora: Date): string {
  const sobra =
    s.total > s.editais.length
      ? `<tr><td style="padding:2px 0 12px;font-family:${FONTE};font-size:13px;line-height:1.5;color:${COR.inkMuted};">${escapar(textoSobra(s))}</td></tr>`
      : '';
  const borda = i > 0 ? `border-top:1px solid ${COR.line};` : '';
  return `<tr><td class="em-px" style="padding:22px 28px 6px;${borda}">
${tituloSecao(s.nome, contagemSecao(s))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">${s.editais.map((e) => editalHtml(e, agora)).join('')}${sobra}</table>
<p style="margin:0 0 16px;font-family:${FONTE};font-size:12px;line-height:1.5;">${linkRodape(linkSair(s.tokenSair), 'Parar de receber este alerta')}</p>
</td></tr>`;
}

/** Assunto (cabeçalho Subject): sempre numa linha só; o Resend codifica o que não é ASCII. */
export function assuntoDoEmail(secoes: readonly SecaoEmail[]): string {
  const n = secoes.reduce((soma, s) => soma + s.editais.length, 0);
  const quantos = plural(n, 'edital novo', 'editais novos');
  return umaLinha(secoes.length === 1 ? `${quantos} para "${secoes[0].nome}"` : `${quantos} nos seus alertas`);
}

/** Pré-cabeçalho (a linha que aparece depois do assunto na caixa de entrada): só nomes e contagens. */
const preCabecalhoAlertas = (secoes: readonly SecaoEmail[]) => secoes.map((s) => `${s.nome}: ${contagemSecao(s)}`).join(' · ');

const RAZAO_ALERTAS = 'Você recebe este e-mail porque criou alertas no Edital Map. Os editais vêm do PNCP: confira sempre o edital oficial.';

export function montarEmail(e: { secoes: SecaoEmail[]; tokenSairTodos: string; agora?: Date }): EmailMontado {
  const agora = e.agora ?? new Date();
  const topo = abertura('Alertas', 'Editais novos nos seus alertas', 'Publicados no PNCP desde o último e-mail. Abra um edital para ver itens, prazos e o link oficial.');
  const rodape = `${escapar(RAZAO_ALERTAS)}<br>
${linkRodape(url('/alertas'), 'Gerenciar alertas')} · ${linkRodape(linkSair(e.tokenSairTodos), 'Parar todos os alertas')}`;
  const texto = [
    'Editais novos nos seus alertas',
    '',
    ...e.secoes.flatMap((s) => [
      `== ${umaLinha(s.nome)} · ${contagemSecao(s)} ==`,
      ...s.editais.map((x) => editalTexto(x, agora)),
      ...(s.total > s.editais.length ? [textoSobra(s)] : []),
      `Parar de receber este alerta: ${linkSair(s.tokenSair)}`,
      '',
    ]),
    RAZAO_ALERTAS,
    `Gerenciar alertas: ${url('/alertas')}`,
    `Parar todos os alertas: ${linkSair(e.tokenSairTodos)}`,
  ].join('\n');
  return {
    assunto: assuntoDoEmail(e.secoes),
    html: moldura(topo + e.secoes.map((s, i) => secaoHtml(s, i, agora)).join(''), rodape, preCabecalhoAlertas(e.secoes)),
    texto,
    cabecalhos: cabecalhosDescadastro(e.tokenSairTodos),
  };
}
