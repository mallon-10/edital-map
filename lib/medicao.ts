/**
 * Medição do Google Ads (entrega 3 do MVP pago). Conta 988-698-8976; o ID da tag e os rótulos são públicos (vão no HTML).
 * Consent Mode v2: tudo começa negado; só a escolha "aceito" no aviso libera cookies de anúncio.
 */
export const ID_GOOGLE_ADS = 'AW-18520543547';

export const CONVERSOES = {
  /** Principal: assinatura do Pro confirmada (/obrigado), com valor. */
  assinou: 'AW-18520543547/RW5kCOOwmKEdELuipP9E',
  /** Secundária: "Gerar QR Code" ou "Pagar" em /assinar. */
  checkout: 'AW-18520543547/HKjPCOawmKEdELuipP9E',
  /** Secundária: primeiro cartão do limite grátis no dia. */
  limite: 'AW-18520543547/mNfMCOmwmKEdELuipP9E',
  /** Secundária: primeira busca com termo no dia. */
  buscou: 'AW-18520543547/Cw0ACOywmKEdELuipP9E',
} as const;

export type Conversao = keyof typeof CONVERSOES;

export function eventoConversao(c: Conversao, extra: { valorCentavos?: number; transacao?: string } = {}): Record<string, unknown> {
  const e: Record<string, unknown> = { send_to: CONVERSOES[c] };
  if (extra.valorCentavos !== undefined) {
    e.value = extra.valorCentavos / 100;
    e.currency = 'BRL';
  }
  if (extra.transacao) e.transaction_id = extra.transacao;
  return e;
}

type Armazenamento = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const PREFIXO = 'em_medido:';

export function jaMedido(s: Armazenamento, chave: string): boolean {
  try {
    return s.getItem(PREFIXO + chave) === '1';
  } catch {
    return false;
  }
}

export function marcarMedido(s: Armazenamento, chave: string): void {
  try {
    s.setItem(PREFIXO + chave, '1');
  } catch {
    // Sem armazenamento (aba anônima bloqueada): a conversão pode repetir; o Google ainda deduplica a compra pelo transaction_id.
  }
}

export const CHAVE_CONSENTIMENTO = 'em_cookies';
export type Consentimento = 'aceito' | 'recusado';

export function lerConsentimento(s: Armazenamento): Consentimento | null {
  try {
    const v = s.getItem(CHAVE_CONSENTIMENTO);
    return v === 'aceito' || v === 'recusado' ? v : null;
  } catch {
    return null;
  }
}
