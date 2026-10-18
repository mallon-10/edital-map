import 'server-only';
import type { Plano } from '../limites';
import { configPagamento } from '../pagamento/config';
import type { Contexto } from './registro';
import { usuarioAtual } from './sessao';
import { supabaseServidor } from './supabase';

/** Pagamento ligado = as variáveis da Cakto estão configuradas (lib/pagamento/config.ts). */
export function pagamentoLigado(): boolean {
  return configPagamento() !== null;
}

/** Assinatura válida (não estornada e dentro da validade; cancelada vale até o fim) com o e-mail da conta. */
async function proPeloEmail(email: string): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('assinaturas')
    .select('id')
    .eq('email', email.toLowerCase())
    .neq('status', 'estornada')
    .gt('valido_ate', new Date().toISOString())
    .limit(1);
  if (error) {
    console.error(`assinatura do e-mail: ${error.message}`);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * Plano de quem está na página (spec do pagamento, revisão 2, §5): Pro se for o dono confiável, se houver uma
 * assinatura válida ligada a este navegador (o da compra) ou se a conta logada (Fase 3) tiver uma assinatura válida pelo
 * e-mail. Sem nada disso, ou com o banco fora: grátis. Também usado pela Prévia do Radar e pela Fase 4.
 */
export async function planoAtual(ctx: Contexto | null): Promise<Plano> {
  if (ctx?.dono) return 'pro';
  if (ctx) {
    const { data, error } = await supabaseServidor().rpc('plano_do_visitante', { p_visitante: ctx.visitante });
    if (error) console.error(`plano_do_visitante: ${error.message}`);
    else if (data === 'pro') return 'pro';
  }
  // Sem cookie de sessão o usuarioAtual nem consulta o Auth (lib/servidor/sessao.ts).
  const usuario = await usuarioAtual();
  if (usuario?.email && (await proPeloEmail(usuario.email))) return 'pro';
  return 'gratis';
}
