/**
 * E-mail do código de acesso (login por código de 6 dígitos). O site manda este e-mail pelo Resend
 * (lib/servidor/emailCodigo.ts); o Supabase só manda o dele quando o envio pelo site falha. Puro e sem fs: o HTML vai
 * no pacote da função na Vercel. MODELO_CODIGO_HTML é idêntico a supabase/templates/codigo.html (a cópia para colar no
 * modelo do Supabase, usado só na reserva); lib/emailCodigo.test.ts guarda os dois iguais.
 */

export const REMETENTE_CODIGO = 'Edital Map <nao-responda@editalmap.com.br>';
/** Sem o código no assunto: a notificação do celular não mostra o código na tela bloqueada. */
export const ASSUNTO_CODIGO = 'Seu código do Edital Map';

const MARCADOR = '{{ .Token }}';

/** Só 6 dígitos entram no modelo (o código vem do Supabase Auth, mas nada além de números vai para o HTML). */
export function codigoValido(codigo: unknown): codigo is string {
  return typeof codigo === 'string' && /^\d{6}$/.test(codigo);
}

function exigirCodigo(codigo: string): string {
  if (!codigoValido(codigo)) throw new Error('código fora do formato de 6 dígitos');
  return codigo;
}

export function htmlDoCodigo(codigo: string): string {
  return MODELO_CODIGO_HTML.replace(MARCADOR, exigirCodigo(codigo));
}

export function textoDoCodigo(codigo: string): string {
  return [
    'Seu código para entrar no Edital Map:',
    '',
    exigirCodigo(codigo),
    '',
    'Digite os 6 números na tela de entrada do site. Vale por 1 hora e só funciona uma vez.',
    '',
    'Não foi você? Se você não pediu para entrar, ignore este e-mail: ninguém entra na sua conta sem o código. Não passe este código para ninguém.',
    '',
    'Edital Map · licitações abertas no mapa · https://www.editalmap.com.br/',
  ].join('\n');
}

export const MODELO_CODIGO_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Seu código para entrar no Edital Map</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&amp;family=JetBrains+Mono:wght@500;700&amp;display=swap" rel="stylesheet">
<style>
:root { color-scheme: light only; supported-color-schemes: light only; }
@media (max-width: 620px) {
  .em-px { padding-left: 20px !important; padding-right: 20px !important; }
  .em-codigo { font-size: 32px !important; letter-spacing: 8px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#f4f1e8;color:#0c2340;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Seu código de acesso ao Edital Map. Vale por 1 hora.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f1e8" style="background:#f4f1e8;">
<tr><td align="center" style="padding:24px 10px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td style="padding:4px 6px 18px;"><a href="https://www.editalmap.com.br/" style="text-decoration:none;"><img src="https://www.editalmap.com.br/marca/logo-email.png" width="180" height="40" alt="Edital Map" style="display:block;border:0;outline:none;width:180px;height:40px;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;font-size:20px;font-weight:700;color:#0c2340;"></a></td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid #ddd6c6;border-top:4px solid #ff5a1f;border-radius:12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td class="em-px" style="padding:28px 32px 4px;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;">
<div style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b33a0e;">Código de acesso</div>
<h1 style="margin:6px 0 0;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;font-size:23px;line-height:1.25;font-weight:700;color:#0c2340;">Use este código para entrar no Edital Map</h1>
<p style="margin:8px 0 0;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;font-size:15px;line-height:1.5;color:#3e5373;">Digite os 6 números na tela de entrada do site.</p>
</td></tr>
<tr><td class="em-px" style="padding:20px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#ebe6d9" style="background:#ebe6d9;border:1px solid #ddd6c6;border-radius:10px;padding:20px 12px;">
<div class="em-codigo" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:38px;line-height:1.1;font-weight:700;letter-spacing:12px;color:#0c2340;margin-right:-12px;">{{ .Token }}</div>
</td>
</tr></table>
</td></tr>
<tr><td class="em-px" style="padding:12px 32px 4px;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;">
<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fcefc2;color:#7a5600;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;font-size:12px;line-height:1.35;font-weight:600;">Vale por 1 hora e só funciona uma vez</span>
</td></tr>
<tr><td class="em-px" style="padding:16px 32px 28px;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;font-size:13px;line-height:1.55;color:#3e5373;">
<strong style="color:#0c2340;">Não foi você?</strong> Se você não pediu para entrar, ignore este e-mail: ninguém entra na sua conta sem o código. Não passe este código para ninguém.
</td></tr>
</table>
</td></tr>
<tr><td class="em-px" style="padding:20px 8px 0;font-family:'Instrument Sans',Arial,Helvetica,system-ui,sans-serif;font-size:12px;line-height:1.6;color:#3e5373;">Você recebe este e-mail porque alguém digitou este endereço para entrar no Edital Map.</td></tr>
<tr><td style="padding:14px 8px 0;font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:11px;line-height:1.5;letter-spacing:0.02em;color:#3e5373;">Edital Map · licitações abertas no mapa · <a href="https://www.editalmap.com.br/" style="color:#3e5373;text-decoration:none;">www.editalmap.com.br</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
