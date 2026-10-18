import type { PlanoPago } from '../eventos';
import type { Periodo } from '../planos';

/**
 * Configuração da Cakto (docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md §2). Sem qualquer uma das cinco
 * variáveis o interruptor fica desligado (null): o site continua com a lista de espera e os recursos abertos.
 */
export type ConfigPagamento = { ofertas: Record<PlanoPago, Record<Periodo, string>>; segredoWebhook: string };

type Ambiente = Record<string, string | undefined>;

const valor = (env: Ambiente, nome: string) => env[nome]?.trim() || null;

export function configPagamento(env: Ambiente = process.env): ConfigPagamento | null {
  const segredo = valor(env, 'CAKTO_WEBHOOK_SECRET');
  const bm = valor(env, 'CAKTO_OFERTA_BASIC_MENSAL');
  const ba = valor(env, 'CAKTO_OFERTA_BASIC_ANUAL');
  const pm = valor(env, 'CAKTO_OFERTA_PRO_MENSAL');
  const pa = valor(env, 'CAKTO_OFERTA_PRO_ANUAL');
  if (!segredo || !bm || !ba || !pm || !pa) return null;
  return { segredoWebhook: segredo, ofertas: { basic: { mensal: bm, anual: ba }, pro: { mensal: pm, anual: pa } } };
}

export function ofertaPara(cfg: ConfigPagamento, plano: PlanoPago, periodo: Periodo): string {
  return cfg.ofertas[plano][periodo];
}

/** Plano e período pela oferta que a Cakto mandou no webhook (vale isto, não o que o checkout gravou). */
export function planoDaOferta(cfg: ConfigPagamento, ofertaId: string | null): { plano: PlanoPago; periodo: Periodo } | null {
  if (!ofertaId) return null;
  for (const plano of ['basic', 'pro'] as const) {
    for (const periodo of ['mensal', 'anual'] as const) {
      if (cfg.ofertas[plano][periodo] === ofertaId) return { plano, periodo };
    }
  }
  return null;
}

/** Caracteres que a Cakto aceita no `callback` (fora disso ela descarta o valor). */
const CALLBACK = /^[A-Za-z0-9._~-]{1,255}$/;

export function linkCheckout(oferta: string, codigo: string | null): string {
  const base = `https://pay.cakto.com.br/${encodeURIComponent(oferta)}`;
  if (codigo === null) return base;
  if (!CALLBACK.test(codigo)) throw new Error('código de checkout inválido');
  return `${base}?callback=${codigo}`;
}
