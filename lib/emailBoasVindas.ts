import { abertura, botao, COR, escapar, FONTE, MONO, moldura } from './alertas/email';
import { codigoValido } from './emailCodigo';
import type { Periodo } from './planos';
import { url } from './seo/site';

/**
 * E-mail de boas-vindas do Pro (sai pelo webhook da Cakto na assinatura nova, lib/servidor/emailBoasVindas.ts): o Pro
 * está ativo e falta ativar a conta. Leva o código de 6 dígitos (o mesmo do login, vale 1 hora) e o botão que abre a
 * tela do código em /entrar com o e-mail da compra; depois de entrar, a pessoa monta o radar (/radar/comecar). Sem
 * código (o Auth falhou), o botão abre a tela de pedir o código. Puro: o servidor monta e o Resend envia.
 */

export const REMETENTE_BOAS_VINDAS = 'Edital Map <nao-responda@editalmap.com.br>';
export const ASSUNTO_BOAS_VINDAS = 'Seu Pro está ativo: falta ativar sua conta';

export type BoasVindas = { assunto: string; html: string; texto: string };

/** /entrar para ativar a conta e seguir para montar o radar; com o código já enviado, abre a tela do código. */
export function caminhoAtivacao(email: string | null, comCodigo = true): string {
  const p = new URLSearchParams();
  if (email) {
    p.set('email', email);
    if (comCodigo) p.set('etapa', 'codigo');
  }
  p.set('voltar', '/radar/comecar');
  return `/entrar?${p.toString()}`;
}

export function linkAtivacao(email: string, comCodigo: boolean): string {
  return url(caminhoAtivacao(email, comCodigo));
}

const PASSOS = [
  ['Ative sua conta', 'Toque no botão e digite o código. Sem senha.'],
  ['Monte seu radar', 'Diga o que sua empresa vende. Usamos isso para achar os editais certos.'],
  ['Receba no seu e-mail', 'Os editais novos todo dia às 7h e o resumo da semana na segunda.'],
] as const;

function caixaCodigo(codigo: string): string {
  return `<tr><td class="em-px" style="padding:18px 28px 4px;">
<div style="font-family:${FONTE};font-size:13px;line-height:1.4;font-weight:600;color:${COR.inkMuted};">Seu código de ativação</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>
<td align="center" bgcolor="${COR.sunken}" style="background:${COR.sunken};border:1px solid ${COR.line};border-radius:10px;padding:18px 12px;">
<div style="font-family:${MONO};font-size:34px;line-height:1.1;font-weight:700;letter-spacing:10px;color:${COR.ink};margin-right:-10px;">${codigo}</div>
</td>
</tr></table>
<div style="margin-top:10px;font-family:${FONTE};font-size:13px;line-height:1.5;color:${COR.inkMuted};">Vale por 1 hora. Venceu? Na tela do código, toque em <strong style="color:${COR.ink};">Reenviar código</strong>.</div>
</td></tr>`;
}

function passosHtml(): string {
  const linhas = PASSOS.map(
    ([titulo, frase], i) => `<tr>
<td valign="top" width="34" style="padding:0 0 12px;"><div style="width:26px;height:26px;border-radius:13px;background:${i === 0 ? COR.pin : COR.sunken};color:${COR.ink};font-family:${FONTE};font-size:13px;line-height:26px;font-weight:700;text-align:center;">${i + 1}</div></td>
<td valign="top" style="padding:2px 0 12px;font-family:${FONTE};font-size:14px;line-height:1.45;color:${COR.inkMuted};"><strong style="color:${COR.ink};">${escapar(titulo)}.</strong> ${escapar(frase)}</td>
</tr>`,
  ).join('');
  return `<tr><td class="em-px" style="padding:22px 28px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhas}</table></td></tr>`;
}

export function montarBoasVindas(p: { email: string; codigo: string | null; periodo: Periodo }): BoasVindas {
  const codigo = codigoValido(p.codigo) ? p.codigo : null;
  const link = linkAtivacao(p.email, codigo !== null);
  const plano = `Pro ${p.periodo === 'anual' ? 'anual' : 'mensal'}`;
  const frase = codigo
    ? `Falta um passo: ative sua conta com o código abaixo para receber os editais no seu e-mail. Conta: ${p.email}.`
    : `Falta um passo: ative sua conta para receber os editais no seu e-mail. Na tela de entrada, toque em Enviar código. Conta: ${p.email}.`;
  const conteudo = [
    abertura(`Pagamento confirmado · ${plano}`, 'Seu Pro está ativo', frase),
    codigo ? caixaCodigo(codigo) : '',
    `<tr><td class="em-px" style="padding:20px 28px 4px;">${botao(link, 'Ativar minha conta', 'grande')}</td></tr>`,
    passosHtml(),
  ].join('\n');
  const rodape = 'Você recebe este e-mail porque assinou o Pro do Edital Map com este endereço. Para entrar de novo, use sempre este mesmo e-mail.';
  const texto = [
    `Pagamento confirmado · ${plano}`,
    '',
    'Seu Pro está ativo. Falta um passo: ative sua conta para receber os editais no seu e-mail.',
    `Conta: ${p.email}`,
    '',
    ...(codigo
      ? [`Seu código de ativação: ${codigo}`, 'Vale por 1 hora. Venceu? Na tela do código, toque em Reenviar código.', '']
      : ['Na tela de entrada, toque em Enviar código e digite o código que chegar no seu e-mail.', '']),
    `Ativar minha conta: ${link}`,
    '',
    ...PASSOS.map(([titulo, frase], i) => `${i + 1}. ${titulo}. ${frase}`),
    '',
    rodape,
    '',
    'Edital Map · licitações abertas no mapa · https://www.editalmap.com.br/',
  ].join('\n');
  return { assunto: ASSUNTO_BOAS_VINDAS, html: moldura(conteudo, escapar(rodape), 'Falta um passo: ative sua conta com o código.'), texto };
}
