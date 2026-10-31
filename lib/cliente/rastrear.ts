import { ID_GA4 } from '../medicao';
import { type EventoComercial, parametrosGa, type ParametrosComerciais, vaiAoBanco } from '../rastreio';
import { registrar } from './registrar';

/** A tag do Google carrega depois da página: o evento da abertura espera por ela uma vez. */
const ESPERA_TAG_MS = 1500;

function paraGa(evento: EventoComercial, p: ParametrosComerciais): void {
  if (!ID_GA4) return;
  const enviar = () => window.gtag?.('event', evento, { ...parametrosGa(p), send_to: ID_GA4 });
  if (typeof window.gtag === 'function') enviar();
  else window.setTimeout(enviar, ESPERA_TAG_MS);
}

/**
 * Evento do funil comercial: vai ao GA4 (Consent Mode de components/TagGoogle.tsx: sem o "Aceitar", só o sinal anônimo) e,
 * se o banco ainda não tem esse dado, ao painel do dono pelo /api/eventos. `soGa` para o que apareceria em toda página,
 * ou já tem o seu evento (viu_precos, clicou_assinar). Medição nunca atrapalha a tela.
 */
export function rastrear(evento: EventoComercial, parametros: ParametrosComerciais = {}, opcoes: { soGa?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  const p = { ...parametros, pagina: parametros.pagina ?? window.location.pathname };
  try {
    paraGa(evento, p);
  } catch {
    // medição é secundária
  }
  if (!opcoes.soGa && vaiAoBanco(evento)) registrar('usou_recurso', { recurso: evento, ...p });
}
