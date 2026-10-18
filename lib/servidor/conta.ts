import 'server-only';
import type { IdPlano } from '../planos';
import { lerPlano, maiorPlano, type PlanoConta } from '../limitesConta';
import { linhaDoRadar, radarDaLinha, type Radar } from '../radar';
import { planoDoNavegador } from './planoNavegador';
import type { Contexto } from './registro';
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

/**
 * Plano da conta (Fase 4, §1): Pro se plano_da_conta (perfis.plano manual ou assinatura válida com o e-mail da conta,
 * 0016) ou, quando há navegador, o plano dele (planoAtual: dono confiável, assinatura do navegador) for Pro. Banco fora:
 * a parte da conta vale grátis. Os envios por e-mail (sem navegador) usam só a parte da conta.
 */
export async function planoDaConta(usuario: Usuario, ctx: Contexto | null = null): Promise<PlanoConta> {
  const [conta, navegador] = await Promise.all([
    supabaseServidor().rpc('plano_da_conta', { p_user: usuario.id }),
    ctx ? planoDoNavegador(ctx) : Promise.resolve('gratis'),
  ]);
  if (conta.error) console.error(`plano_da_conta: ${conta.error.message}`);
  const daConta = conta.error ? 'gratis' : lerPlano(conta.data);
  const doNavegador = lerPlano(navegador);
  return { plano: maiorPlano(daConta, doNavegador), daConta, doNavegador };
}

/** Resumo semanal do Pro ligado nesta conta? Sem perfil: ligado (o padrão da coluna). */
export async function resumoSemanalLigado(usuario: Usuario): Promise<boolean> {
  const { data, error } = await supabaseServidor().from('perfis').select('resumo_semanal').eq('id', usuario.id).maybeSingle();
  if (error) throw new Error(`resumo semanal: ${error.message}`);
  return (data as { resumo_semanal?: unknown } | null)?.resumo_semanal !== false;
}

export async function mudarResumoSemanal(usuario: Usuario, ligado: boolean): Promise<void> {
  const { error } = await supabaseServidor().from('perfis').update({ resumo_semanal: ligado }).eq('id', usuario.id);
  if (error) throw new Error(`mudar resumo semanal: ${error.message}`);
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
