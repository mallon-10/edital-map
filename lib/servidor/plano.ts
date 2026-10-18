import 'server-only';
import type { Plano } from '../limites';
import { configPagamento } from '../pagamento/config';
import type { Contexto } from './registro';
import { supabaseServidor } from './supabase';

/** Pagamento ligado = as variáveis da Cakto estão configuradas (lib/pagamento/config.ts). */
export function pagamentoLigado(): boolean {
  return configPagamento() !== null;
}

/**
 * Plano do navegador (spec do pagamento, §5): a maior assinatura válida ligada a ele. Dono confiável = Pro.
 * Sem visitante ou banco fora: grátis. Também usado pela Prévia do Radar (Fase 3); com conta, passa a ler perfis.plano.
 */
export async function planoAtual(ctx: Contexto | null): Promise<Plano> {
  if (!ctx) return 'gratis';
  if (ctx.dono) return 'pro';
  const { data, error } = await supabaseServidor().rpc('plano_do_visitante', { p_visitante: ctx.visitante });
  if (error) {
    console.error(`plano_do_visitante: ${error.message}`);
    return 'gratis';
  }
  return data === 'basic' || data === 'pro' ? data : 'gratis';
}
