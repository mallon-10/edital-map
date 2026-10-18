import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Links "Parar de receber" dos e-mails (alertas e resumo semanal), sem login: `<tipo>.<uuid>.<HMAC-SHA256 base64url>`
 * com ALERTAS_SEGREDO. a = um alerta, t = todos os alertas da conta, r = resumo semanal da conta. Sem validade (link
 * de descadastro precisa funcionar sempre); uuid, não id sequencial. Só servidor e job (node:crypto). Sem segredo (ou
 * curto) nada é criado nem aceito: não existe segredo padrão.
 */

export type AlvoDescadastro = { tipo: 'alerta'; id: string } | { tipo: 'todos'; conta: string } | { tipo: 'resumo'; conta: string };

export const TAMANHO_MINIMO_SEGREDO = 32;
const FORMATO = /^([atr])\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/;

export function lerSegredo(v: string | undefined): string | null {
  const s = v?.trim();
  return s && s.length >= TAMANHO_MINIMO_SEGREDO ? s : null;
}

const assinar = (conteudo: string, segredo: string) => createHmac('sha256', segredo).update(`descadastro:${conteudo}`).digest('base64url');

/** Lança erro (sem o id na mensagem) se o segredo for curto ou o alvo não for um uuid minúsculo. */
export function criarTokenDescadastro(alvo: AlvoDescadastro, segredo: string): string {
  if (!lerSegredo(segredo)) throw new Error('ALERTAS_SEGREDO ausente ou curto.');
  const conteudo = alvo.tipo === 'alerta' ? `a.${alvo.id}` : `${alvo.tipo === 'todos' ? 't' : 'r'}.${alvo.conta}`;
  const token = `${conteudo}.${assinar(conteudo, segredo)}`;
  if (!FORMATO.test(token)) throw new Error('Alvo de descadastro inválido.');
  return token;
}

/** Alvo do token, ou null se malformado, adulterado, de outro segredo ou sem segredo válido. Comparação em tempo constante. */
export function lerTokenDescadastro(token: unknown, segredo: string | null): AlvoDescadastro | null {
  if (!segredo || !lerSegredo(segredo) || typeof token !== 'string' || token.length > 120) return null;
  const m = FORMATO.exec(token);
  if (!m) return null;
  const esperado = Buffer.from(assinar(`${m[1]}.${m[2]}`, segredo));
  const recebido = Buffer.from(m[3]);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  if (m[1] === 'a') return { tipo: 'alerta', id: m[2] };
  return m[1] === 't' ? { tipo: 'todos', conta: m[2] } : { tipo: 'resumo', conta: m[2] };
}
