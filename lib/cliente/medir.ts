import { type Consentimento, CHAVE_CONSENTIMENTO, type Conversao, eventoConversao, jaMedido, marcarMedido } from '../medicao';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const armazenamento = () => (typeof window === 'undefined' ? null : window.localStorage);
const hojeBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/**
 * Dispara uma conversão do Google Ads. `chave` evita repetir (por dia ou por compra). Sem a tag carregada (robô,
 * bloqueador), não faz nada. Com o consentimento negado o Google recebe só o sinal anônimo (Consent Mode).
 */
export function medir(c: Conversao, opcoes: { chave?: 'dia' | string; valorCentavos?: number; transacao?: string; email?: string } = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const s = armazenamento();
  const chave = opcoes.chave === 'dia' ? `${c}:${hojeBrasilia()}` : opcoes.chave ? `${c}:${opcoes.chave}` : null;
  if (s && chave && jaMedido(s, chave)) return;
  // Conversões otimizadas: o e-mail da compra vai normalizado; a tag do Google faz o hash antes de enviar.
  if (opcoes.email) window.gtag('set', 'user_data', { email: opcoes.email.trim().toLowerCase() });
  window.gtag('event', 'conversion', eventoConversao(c, opcoes));
  if (s && chave) marcarMedido(s, chave);
}

/** Grava a escolha do aviso de cookies e atualiza o Consent Mode. */
export function escolherConsentimento(v: Consentimento): void {
  try {
    window.localStorage.setItem(CHAVE_CONSENTIMENTO, v);
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
  const estado = v === 'aceito' ? 'granted' : 'denied';
  window.gtag?.('consent', 'update', {
    ad_storage: estado, ad_user_data: estado, ad_personalization: estado, analytics_storage: estado,
  });
}
