import 'server-only';
import { alertaDaLinha, linhaDoAlerta, STATUS_ENVIO, type Alerta, type AlertaDaConta, type StatusEnvio, type UltimoEnvio } from '../alertas/regras';
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
  const envios = await sb
    .from('envios_alerta')
    .select('alerta_id, status, iniciado_em, qtd_editais')
    .eq('user_id', usuario.id)
    .order('iniciado_em', { ascending: false })
    .limit(100);
  if (envios.error) throw new Error(`envios dos alertas: ${envios.error.message}`);
  const ultimo = new Map<string, UltimoEnvio>();
  for (const l of (envios.data ?? []) as Array<Record<string, unknown>>) {
    const id = String(l.alerta_id);
    const status = String(l.status);
    if (!ultimo.has(id) && (STATUS_ENVIO as readonly string[]).includes(status)) {
      ultimo.set(id, { status: status as StatusEnvio, em: String(l.iniciado_em), qtd: Number(l.qtd_editais ?? 0) });
    }
  }
  return alertas.map((a) => ({ ...a, ultimoEnvio: ultimo.get(a.id) ?? null }));
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
  if (error) throw new Error(`criar alerta: ${error.message}`);
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
