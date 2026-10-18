import { type Consentimento, CHAVE_CONSENTIMENTO, type Conversao, ID_GA4, lerConsentimento, eventoConversao, jaMedido, marcarMedido } from '../medicao';

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

/** client_id e session_id do GA4 e o consentimento, para a compra ir ao GA4 pelo servidor. Sem GA4 ou sem tag: vazio. */
export async function dadosGa4(): Promise<{ cliente: string | null; sessao: string | null; consentimento: boolean }> {
  const consentimento = (() => {
    try {
      return lerConsentimento(window.localStorage) === 'aceito';
    } catch {
      return false;
    }
  })();
  const gtag = window.gtag;
  if (!ID_GA4 || typeof gtag !== 'function') return { cliente: null, sessao: null, consentimento };
  const pegar = (campo: string) =>
    new Promise<string | null>((ok) => {
      const t = window.setTimeout(() => ok(null), 1000);
      gtag('get', ID_GA4, campo, (v: unknown) => {
        window.clearTimeout(t);
        ok(v === undefined || v === null ? null : String(v));
      });
    });
  const [cliente, sessao] = await Promise.all([pegar('client_id'), pegar('session_id')]);
  return { cliente, sessao, consentimento };
}
