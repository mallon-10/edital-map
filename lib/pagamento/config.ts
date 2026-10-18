import type { Periodo } from '../planos';

/**
 * Configuração da Cakto (spec do pagamento, revisão 2, §3): só o Pro, mensal e anual, cobrado pela API (checkout
 * próprio). Sem qualquer uma das cinco variáveis o interruptor fica desligado (null): o site continua com a lista de
 * espera e os recursos abertos. `clienteId` é público (vai para o SDK do navegador); `clienteSegredo` só no servidor.
 */
export type ConfigPagamento = { ofertas: Record<Periodo, string>; segredoWebhook: string; clienteId: string; clienteSegredo: string };

type Ambiente = Record<string, string | undefined>;

const valor = (env: Ambiente, nome: string) => env[nome]?.trim() || null;

export function configPagamento(env: Ambiente = process.env): ConfigPagamento | null {
  const segredoWebhook = valor(env, 'CAKTO_WEBHOOK_SECRET');
  const clienteId = valor(env, 'CAKTO_CLIENT_ID');
  const clienteSegredo = valor(env, 'CAKTO_CLIENT_SECRET');
  const mensal = valor(env, 'CAKTO_OFERTA_PRO_MENSAL');
  const anual = valor(env, 'CAKTO_OFERTA_PRO_ANUAL');
  if (!segredoWebhook || !clienteId || !clienteSegredo || !mensal || !anual) return null;
  return { segredoWebhook, clienteId, clienteSegredo, ofertas: { mensal, anual } };
}

export function ofertaPara(cfg: ConfigPagamento, periodo: Periodo): string {
  return cfg.ofertas[periodo];
}

/** Plano e período pela oferta que a Cakto mandou no webhook (vale isto, não o que o checkout gravou). */
export function planoDaOferta(cfg: ConfigPagamento, ofertaId: string | null): { plano: 'pro'; periodo: Periodo } | null {
  if (!ofertaId) return null;
  if (ofertaId === cfg.ofertas.mensal) return { plano: 'pro', periodo: 'mensal' };
  if (ofertaId === cfg.ofertas.anual) return { plano: 'pro', periodo: 'anual' };
  return null;
}
