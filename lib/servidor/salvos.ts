import 'server-only';
import { lerStatus, salvoDaLinha, type MapaSalvos, type SalvoDaConta, type StatusSalvo } from '../salvos';
import type { Usuario } from './sessao';
import { supabaseServidor } from './supabase';

/**
 * Salvos da conta (Minhas Oportunidades). Única porta para public.salvos no site: toda função recebe o `Usuario` da
 * sessão (auth.getUser()) e filtra ou grava pelo id dele, com a service role. Nunca um id do navegador.
 */

export type ResultadoGravar = 'ok' | 'limite' | 'sem_edital';

/** Salva, muda o status ou descarta (gravar_salvo, 0016: existência e limite numa transação por conta). */
export async function gravarSalvo(usuario: Usuario, id: string, status: StatusSalvo, limite: number): Promise<ResultadoGravar> {
  const { data, error } = await supabaseServidor().rpc('gravar_salvo', { p_user: usuario.id, p_contratacao: id, p_status: status, p_limite: limite });
  if (error) throw new Error(`gravar_salvo: ${error.message}`);
  if (data === 'ok' || data === 'limite' || data === 'sem_edital') return data;
  throw new Error(`gravar_salvo: resposta inesperada ${String(data)}`);
}

export async function mudarObservacao(usuario: Usuario, id: string, observacao: string | null, agora: Date = new Date()): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('salvos')
    .update({ observacao, atualizado_em: agora.toISOString() })
    .eq('user_id', usuario.id)
    .eq('contratacao_id', id)
    .select('contratacao_id');
  if (error) throw new Error(`observação: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

export async function removerSalvo(usuario: Usuario, id: string): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('salvos')
    .delete()
    .eq('user_id', usuario.id)
    .eq('contratacao_id', id)
    .select('contratacao_id');
  if (error) throw new Error(`remover salvo: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

/** Por edital: status e se tem observação (botões dos cards, cartão do radar, descartados fora do radar). */
export async function estadoDosSalvos(usuario: Usuario): Promise<MapaSalvos> {
  const { data, error } = await supabaseServidor()
    .from('salvos')
    .select('contratacao_id, status, observacao')
    .eq('user_id', usuario.id)
    .limit(1000);
  if (error) throw new Error(`salvos: ${error.message}`);
  const mapa: MapaSalvos = {};
  for (const l of (data ?? []) as Array<Record<string, unknown>>) {
    const status = lerStatus(l.status);
    if (status) mapa[String(l.contratacao_id)] = { status, nota: typeof l.observacao === 'string' && l.observacao.length > 0 };
  }
  return mapa;
}

/** Minhas Oportunidades: salvos com os dados do edital (salvos_da_conta, 0016). */
export async function salvosDaConta(usuario: Usuario): Promise<SalvoDaConta[]> {
  const { data, error } = await supabaseServidor().rpc('salvos_da_conta', { p_user: usuario.id });
  if (error) throw new Error(`salvos_da_conta: ${error.message}`);
  return ((data ?? []) as Array<Record<string, unknown>>).map(salvoDaLinha);
}
