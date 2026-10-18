import { EMAIL } from './eventos';

/**
 * Regras puras da conta (login por código do Supabase Auth): o que o formulário e as rotas aceitam, para onde voltar
 * depois de entrar e as mensagens de erro em português. Sem rede e sem segredo: o servidor fala com o Supabase em
 * lib/servidor/sessao.ts.
 */

export const DIGITOS_CODIGO = 6;
export const REENVIO_SEGUNDOS = 60;
export const DESTINO_PADRAO = '/radar';

export const MENSAGENS_CONTA = {
  email: 'Confira o e-mail.',
  codigo: 'Digite os 6 números do código.',
  codigoErrado: 'Código incorreto ou expirado. Confira os 6 números ou peça um novo código.',
  muitas: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  falha: 'Não foi possível concluir agora. Tente de novo em instantes.',
  entrar: 'Entre para continuar.',
  /** Lista da conta (salvos, alertas) fora do ar: a página fica, com este aviso no lugar da lista. */
  carregar: 'Não deu para carregar agora. Tente de novo em instantes.',
  /** Link do e-mail vencido, já usado ou aberto em outro navegador. */
  link: 'Esse link de entrada não funcionou (vencido ou aberto em outro navegador). Peça um código novo abaixo.',
} as const;

/** Erro do Supabase Auth reduzido ao que importa (AuthError.code e .status). */
export type ErroAuth = { code: string | null; status: number | null };

/** Cookies da sessão: só o servidor lê (httpOnly), nunca saem para outro site (lax). */
export const OPCOES_COOKIE_SESSAO = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function lerEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

export function lerCodigo(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const c = v.replace(/\s+/g, '');
  return new RegExp(`^\\d{${DIGITOS_CODIGO}}$`).test(c) ? c : null;
}

/** Código de troca (PKCE) que o link do e-mail traz em ?code=: só letras, números e hífen, tamanho de token. */
export function lerCodigoDoLink(v: unknown): string | null {
  return typeof v === 'string' && /^[A-Za-z0-9-]{8,128}$/.test(v) ? v : null;
}

/**
 * Para onde ir depois de entrar: só caminho deste site, fora de /entrar e /api; o resto vira /radar.
 * Controle, espaço e barra invertida são recusados: o navegador ignora TAB/CR/LF em URLs, então "/\t/mal.com" viraria "//mal.com".
 */
export function destinoSeguro(v: string | null | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || /[\u0000- \u007f\\]/.test(v)) return DESTINO_PADRAO;
  if (v === '/entrar' || v.startsWith('/entrar?') || v.startsWith('/entrar/') || /^\/api(\/|\?|#|$)/i.test(v)) return DESTINO_PADRAO;
  return v.slice(0, 200);
}

const limiteAtingido = (e: ErroAuth) => e.status === 429 || (e.code ?? '').startsWith('over_');

export function mensagemErroAuth(e: ErroAuth): string {
  if (e.code === 'otp_expired') return MENSAGENS_CONTA.codigoErrado;
  if (limiteAtingido(e)) return MENSAGENS_CONTA.muitas;
  if (e.code === 'email_address_invalid' || e.code === 'validation_failed') return MENSAGENS_CONTA.email;
  return MENSAGENS_CONTA.falha;
}

export function statusErroAuth(e: ErroAuth): 400 | 429 | 502 {
  if (limiteAtingido(e)) return 429;
  if (e.code === 'otp_expired' || e.code === 'email_address_invalid' || e.code === 'validation_failed') return 400;
  return 502;
}

/** Segundos até poder pedir outro código (0 = já pode). */
export function segundosParaReenvio(enviadoEm: number, agora: number): number {
  return Math.max(0, Math.ceil((enviadoEm + REENVIO_SEGUNDOS * 1000 - agora) / 1000));
}

/** Cookie de sessão do Supabase no navegador: sb-<ref>-auth-token, às vezes em pedaços (.0, .1). */
const COOKIE_SESSAO = /^sb-[a-z0-9]+-auth-token(\.\d+)?$/;

export function temCookieDeSessao(nomes: readonly string[]): boolean {
  return nomes.some((n) => COOKIE_SESSAO.test(n));
}

/** Rotas em que o proxy renova a sessão: conta, radar e as APIs deles. */
export function rotaComSessao(caminho: string): boolean {
  return [
    /^\/entrar$/, /^\/radar(\/|$)/, /^\/oportunidades(\/|$)/, /^\/alertas(\/|$)/,
    /^\/api\/conta(\/|$)/, /^\/api\/radar(\/|$)/, /^\/api\/salvos(\/|$)/, /^\/api\/alertas(\/|$)/,
  ].some((r) => r.test(caminho));
}
