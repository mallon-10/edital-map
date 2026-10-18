import 'server-only';
import { alertaDaLinha, ERRO_TETO_ALERTAS, linhaDoAlerta, STATUS_ENVIO, TetoDeAlertas, type Alerta, type AlertaDaConta, type StatusEnvio, type UltimoEnvio } from '../alertas/regras';
import type { Usuario } from './sessao';
import { supabaseServidor } from './supabase';

/**
 * Alertas da conta. Única porta do site para public.alertas e public.envios_alerta (o descadastro por link, sem
 * sessão, fica em descadastro.ts): toda função recebe o `Usuario` da sessão e filtra ou grava pelo id dele.
 */

const COLUNAS = 'id, nome, termos, termos_excluir, ufs, municipios, valor_min, valor_max, modalidades, so_me_epp, ativo, criado_em, ultimo_envio_em';

export type AlertaComEnvio = AlertaDaConta & { ultimoEnvio: UltimoEnvio | null };

export async function alertasDaConta(usuario: Usuario): Promise<AlertaComEnvio[]> {
  const sb = supabaseServidor();
  const { data, error } = await sb.from('alertas').select(COLUNAS).eq('user_id', usuario.id).order('criado_em');
  if (error) throw new Error(`alertas: ${error.message}`);
  const alertas = ((data ?? []) as Array<Record<string, unknown>>).map(alertaDaLinha);
  if (alertas.length === 0) return [];
  const ultimos = await Promise.all(alertas.map((a) => ultimoEnvio(usuario, a.id)));
  return alertas.map((a, i) => ({ ...a, ultimoEnvio: ultimos[i] }));
}

/**
 * Último envio de um alerta (no máximo 5 por conta, um por consulta): alerta_id + iniciado_em desc usa
 * envios_alerta_alerta_idx e não depende de quantas linhas a conta tem no histórico. user_id da sessão também filtra.
 */
async function ultimoEnvio(usuario: Usuario, alertaId: string): Promise<UltimoEnvio | null> {
  const { data, error } = await supabaseServidor()
    .from('envios_alerta')
    .select('alerta_id, status, iniciado_em, qtd_editais')
    .eq('user_id', usuario.id)
    .eq('alerta_id', alertaId)
    .order('iniciado_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`envios do alerta: ${error.message}`);
  if (!data) return null;
  const l = data as Record<string, unknown>;
  const status = String(l.status);
  if (!(STATUS_ENVIO as readonly string[]).includes(status)) return null;
  return { status: status as StatusEnvio, em: String(l.iniciado_em), qtd: Number(l.qtd_editais ?? 0) };
}

export async function lerAlerta(usuario: Usuario, id: string): Promise<AlertaDaConta | null> {
  const { data, error } = await supabaseServidor().from('alertas').select(COLUNAS).eq('user_id', usuario.id).eq('id', id).maybeSingle();
  if (error) throw new Error(`alerta: ${error.message}`);
  return data ? alertaDaLinha(data as Record<string, unknown>) : null;
}

/** Alertas da conta, ativos e pausados (os dois contam no limite do plano). */
export async function contarAlertas(usuario: Usuario): Promise<number> {
  const { count, error } = await supabaseServidor().from('alertas').select('id', { count: 'exact', head: true }).eq('user_id', usuario.id);
  if (error) throw new Error(`contar alertas: ${error.message}`);
  return count ?? 0;
}

export async function criarAlerta(usuario: Usuario, alerta: Alerta): Promise<string> {
  const { data, error } = await supabaseServidor()
    .from('alertas')
    .insert({ ...linhaDoAlerta(alerta), user_id: usuario.id })
    .select('id')
    .single();
  if (error) throw error.message?.includes(ERRO_TETO_ALERTAS) ? new TetoDeAlertas() : new Error(`criar alerta: ${error.message}`);
  return String((data as { id: unknown }).id);
}

export async function atualizarAlerta(usuario: Usuario, id: string, alerta: Alerta, agora: Date = new Date()): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('alertas')
    .update({ ...linhaDoAlerta(alerta), atualizado_em: agora.toISOString() })
    .eq('user_id', usuario.id)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(`editar alerta: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

/** Pausar (false) ou retomar (true). Pausar não apaga o alerta nem o que já foi enviado. */
export async function mudarAtivoAlerta(usuario: Usuario, id: string, ativo: boolean, agora: Date = new Date()): Promise<boolean> {
  const { data, error } = await supabaseServidor()
    .from('alertas')
    .update({ ativo, atualizado_em: agora.toISOString() })
    .eq('user_id', usuario.id)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(`pausar alerta: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}

export async function excluirAlerta(usuario: Usuario, id: string): Promise<boolean> {
  const { data, error } = await supabaseServidor().from('alertas').delete().eq('user_id', usuario.id).eq('id', id).select('id');
  if (error) throw new Error(`excluir alerta: ${error.message}`);
  return ((data ?? []) as unknown[]).length > 0;
}
