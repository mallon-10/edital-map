import { dataHora, moeda } from '../formato';
import { url } from '../seo/site';
import { rotuloSituacao } from '../situacao';
import { assunto as assuntoDoObjeto, nomeProprio } from '../texto';

/**
 * E-mail dos alertas (Fase 4, §3): um por conta, uma seção por alerta, até 20 editais por alerta. Só o que veio do PNCP,
 * limpo por lib/texto.ts e escapado (o nome do alerta também); valor nulo ou 0 = "Valor não informado". Links absolutos
 * para o site; descadastro por alerta, de todos e de um clique (List-Unsubscribe). Puro: o job monta, o Resend envia.
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

export function editalHtml(e: EditalDoEmail): string {
  const l = linhaDoEdital(e);
  const situacao = l.situacao ? `<span style="font-size:12px;font-weight:bold;color:#b33a0e;"> · ${escapar(l.situacao)}</span>` : '';
  return `<tr><td style="padding:14px 0;border-top:1px solid #ddd6c6;">
<a href="${escapar(l.link)}" style="font-size:16px;font-weight:bold;color:#0c2340;text-decoration:underline;">${escapar(l.titulo)}</a>${situacao}
<div style="margin-top:4px;font-size:14px;color:#3e5373;">${escapar(l.orgao)} · ${escapar(l.local)}</div>
<div style="margin-top:4px;font-size:14px;color:#0c2340;">${escapar(l.valor)} · ${escapar(l.prazo)}</div>
</td></tr>`;
}

export function editalTexto(e: EditalDoEmail): string {
  const l = linhaDoEdital(e);
  return [`- ${umaLinha(l.titulo)}${l.situacao ? ` (${l.situacao})` : ''}`, `  ${umaLinha(l.orgao)} · ${umaLinha(l.local)}`, `  ${l.valor} · ${l.prazo}`, `  ${l.link}`].join('\n');
}

/** Moldura comum (alertas e resumo): cabeçalho com a marca, conteúdo, rodapé com os links de descadastro. */
export function moldura(conteudo: string, rodape: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f4f1e8;font-family:Arial,Helvetica,sans-serif;color:#0c2340;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ddd6c6;border-radius:8px;">
<tr><td style="padding:24px 28px 0;font-size:18px;font-weight:bold;">Edital Map</td></tr>
${conteudo}
<tr><td style="padding:20px 28px 28px;font-size:12px;line-height:1.5;color:#3e5373;border-top:1px solid #ddd6c6;">${rodape}</td></tr>
</table>
</body>
</html>`;
}

const textoSobra = (s: SecaoEmail) => `Mais ${plural(s.total - s.editais.length, 'edital novo entra', 'editais novos entram')} no próximo e-mail.`;

function secaoHtml(s: SecaoEmail): string {
  const sobra = s.total > s.editais.length ? `<tr><td style="padding:10px 0;font-size:13px;color:#3e5373;">${escapar(textoSobra(s))}</td></tr>` : '';
  return `<tr><td style="padding:20px 28px 4px;">
<h2 style="margin:0;font-size:18px;color:#0c2340;">${escapar(s.nome)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${s.editais.map(editalHtml).join('')}${sobra}</table>
<p style="margin:8px 0 0;font-size:12px;"><a href="${escapar(linkSair(s.tokenSair))}" style="color:#3e5373;">Parar de receber este alerta</a></p>
</td></tr>`;
}

/** Assunto (cabeçalho Subject): sempre numa linha só; o Resend codifica o que não é ASCII. */
export function assuntoDoEmail(secoes: readonly SecaoEmail[]): string {
  const n = secoes.reduce((soma, s) => soma + s.editais.length, 0);
  const quantos = plural(n, 'edital novo', 'editais novos');
  return umaLinha(secoes.length === 1 ? `${quantos} para "${secoes[0].nome}"` : `${quantos} nos seus alertas`);
}

export function montarEmail(e: { secoes: SecaoEmail[]; tokenSairTodos: string }): EmailMontado {
  const rodape = `Você recebe este e-mail porque criou alertas no Edital Map. Os editais vêm do PNCP: confira sempre o edital oficial.<br>
<a href="${escapar(url('/alertas'))}" style="color:#3e5373;">Gerenciar alertas</a> · <a href="${escapar(linkSair(e.tokenSairTodos))}" style="color:#3e5373;">Parar todos os alertas</a>`;
  const texto = [
    ...e.secoes.flatMap((s) => [
      `== ${umaLinha(s.nome)} ==`,
      ...s.editais.map(editalTexto),
      ...(s.total > s.editais.length ? [textoSobra(s)] : []),
      `Parar de receber este alerta: ${linkSair(s.tokenSair)}`,
      '',
    ]),
    `Gerenciar alertas: ${url('/alertas')}`,
    `Parar todos os alertas: ${linkSair(e.tokenSairTodos)}`,
  ].join('\n');
  return { assunto: assuntoDoEmail(e.secoes), html: moldura(e.secoes.map(secaoHtml).join(''), rodape), texto, cabecalhos: cabecalhosDescadastro(e.tokenSairTodos) };
}
