import 'server-only';
import type { IdPlano } from '../planos';
import { linhaDoRadar, radarDaLinha, type Radar } from '../radar';
import type { Usuario } from './sessao';
import { supabaseServidor } from './supabase';

/**
 * Perfil e radar da conta. Única porta para public.perfis e public.radares: toda função recebe o `Usuario` da sessão
 * (lib/servidor/sessao.ts, auth.getUser()) e filtra ou grava pelo id dele, com a service role. Nunca um id do navegador.
 */

export type Perfil = { plano: IdPlano; ultimaVisitaRadar: string | null };

const COLUNAS_RADAR = 'termos, termos_excluir, ufs, municipios, valor_min, valor_max, modalidades, so_me_epp';

export async function perfilDaConta(usuario: Usuario): Promise<Perfil> {
  const { data, error } = await supabaseServidor().from('perfis').select('plano, ultima_visita_radar').eq('id', usuario.id).maybeSingle();
  if (error) throw new Error(`perfil: ${error.message}`);
  const linha = (data ?? {}) as { plano?: unknown; ultima_visita_radar?: unknown };
  const plano: IdPlano = linha.plano === 'basic' || linha.plano === 'pro' ? linha.plano : 'gratis';
  return { plano, ultimaVisitaRadar: linha.ultima_visita_radar ? String(linha.ultima_visita_radar) : null };
}

export async function lerRadar(usuario: Usuario): Promise<Radar | null> {
  const { data, error } = await supabaseServidor().from('radares').select(COLUNAS_RADAR).eq('user_id', usuario.id).maybeSingle();
  if (error) throw new Error(`radar: ${error.message}`);
  return data ? radarDaLinha(data as Record<string, unknown>) : null;
}

/**
 * Cria ou troca o radar da conta (um por conta, índice único em user_id). Só as colunas do radar (linhaDoRadar) e o
 * user_id da sessão; atualizado_em vai explícito (o padrão da coluna só vale na criação).
 */
export async function salvarRadar(usuario: Usuario, radar: Radar, agora: Date = new Date()): Promise<'criado' | 'atualizado'> {
  const existente = await lerRadar(usuario);
  const { error } = await supabaseServidor()
    .from('radares')
    .upsert({ ...linhaDoRadar(radar), user_id: usuario.id, atualizado_em: agora.toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(`salvar radar: ${error.message}`);
  return existente ? 'atualizado' : 'criado';
}

/** "Novas desde a sua última visita" conta a partir daqui (gravado ao sair do Meu Radar). */
export async function marcarVisitaRadar(usuario: Usuario, agora: Date = new Date()): Promise<void> {
  const { error } = await supabaseServidor()
    .from('perfis')
    .upsert({ id: usuario.id, ultima_visita_radar: agora.toISOString() }, { onConflict: 'id' });
  if (error) throw new Error(`visita do radar: ${error.message}`);
}
