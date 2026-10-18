import 'server-only';
import type { AlvoDescadastro } from '../alertas/token';
import { supabaseServidor } from './supabase';

/**
 * Descadastro pelo link do e-mail, sem login: só com o alvo de um token verificado (lerTokenDescadastro, HMAC com
 * ALERTAS_SEGREDO). Pausa (nunca apaga) o alerta ou todos os da conta; o resumo semanal vira desligado
 * (parar_resumo_semanal, 0016: perfis só se grava por lib/servidor/conta.ts ou por função do banco). As mensagens de
 * erro não levam o id (o repositório e os logs são públicos).
 */

export async function textoDoDescadastro(alvo: AlvoDescadastro): Promise<string | null> {
  if (alvo.tipo === 'resumo') return 'o resumo semanal do Pro';
  const sb = supabaseServidor();
  if (alvo.tipo === 'alerta') {
    const { data, error } = await sb.from('alertas').select('nome').eq('id', alvo.id).maybeSingle();
    if (error) throw new Error(`descadastro: ${error.message}`);
    return data ? `o alerta "${String((data as { nome: unknown }).nome)}"` : null;
  }
  const { count, error } = await sb.from('alertas').select('id', { count: 'exact', head: true }).eq('user_id', alvo.conta);
  if (error) throw new Error(`descadastro: ${error.message}`);
  return (count ?? 0) > 0 ? 'todos os seus alertas' : null;
}

/** Quantos alertas pausou (todos: só os ativos; resumo: 1 se havia perfil). */
export async function aplicarDescadastro(alvo: AlvoDescadastro, agora: Date = new Date()): Promise<number> {
  const sb = supabaseServidor();
  if (alvo.tipo === 'resumo') {
    const { data, error } = await sb.rpc('parar_resumo_semanal', { p_user: alvo.conta });
    if (error) throw new Error(`parar resumo: ${error.message}`);
    return data === true ? 1 : 0;
  }
  const pausar = sb.from('alertas').update({ ativo: false, atualizado_em: agora.toISOString() });
  const filtrado = alvo.tipo === 'alerta' ? pausar.eq('id', alvo.id) : pausar.eq('user_id', alvo.conta).eq('ativo', true);
  const { data, error } = await filtrado.select('id');
  if (error) throw new Error(`descadastro: ${error.message}`);
  return ((data ?? []) as unknown[]).length;
}
