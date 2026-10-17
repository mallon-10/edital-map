import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import type { Detalhe, PedidoAlerta, PedidoListaEspera, TipoEvento, TipoEventoServidor } from '../eventos';
import { COOKIE_INTERNO, COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie, visitanteValido } from '../visitante';
import { supabaseServidor } from './supabase';

export { COOKIE_INTERNO, COOKIE_VISITANTE };

export type Contexto = { visitante: string; interno: boolean; ipHash: string | null };

/** Hash do IP com o sal do servidor (IP_SAL). Sem sal ou sem IP: null (os limites por IP não valem). */
function hashDoIp(h: { get(nome: string): string | null }): string | null {
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const sal = process.env.IP_SAL;
  return ip && sal ? createHash('sha256').update(`${sal}:${ip}`).digest('hex') : null;
}

/** Lê (ou cria) o visitante anônimo, a marca de interno e o hash do IP. Só em rotas (pode gravar cookie). */
export async function contexto(): Promise<Contexto> {
  const c = await cookies();
  const { visitante, novo } = visitanteDoCookie(c.get(COOKIE_VISITANTE)?.value, randomUUID);
  if (novo) c.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  return { visitante, interno: c.get(COOKIE_INTERNO)?.value === '1', ipHash: hashDoIp(await headers()) };
}

/**
 * Contexto para páginas (componente de servidor não grava cookie; o proxy.ts já garantiu em_visitante).
 * null = sem visitante válido: a página não conta uso.
 */
export async function contextoDaPagina(): Promise<Contexto | null> {
  const c = await cookies();
  const visitante = c.get(COOKIE_VISITANTE)?.value;
  if (!visitanteValido(visitante)) return null;
  return { visitante, interno: c.get(COOKIE_INTERNO)?.value === '1', ipHash: hashDoIp(await headers()) };
}

export async function marcarInterno(): Promise<void> {
  (await cookies()).set(COOKIE_INTERNO, '1', OPCOES_COOKIE);
}

export async function dentroDoLimite(tabela: 'eventos' | 'pedidos_alerta' | 'lista_espera', ipHash: string | null, limite: number): Promise<boolean> {
  if (!ipHash) return true;
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseServidor()
    .from(tabela)
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('criado_em', desde);
  if (error) throw new Error(`limite ${tabela}: ${error.message}`);
  return (count ?? 0) < limite;
}

/** Exportações deste IP na última hora (eventos usou_recurso/exportou gravados por /api/exportar) abaixo do limite. */
export async function exportacaoDentroDoLimite(ipHash: string | null, limite: number): Promise<boolean> {
  if (!ipHash) return true;
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseServidor()
    .from('eventos')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('tipo', 'usou_recurso')
    .eq('detalhe->>recurso', 'exportou')
    .gte('criado_em', desde);
  if (error) throw new Error(`limite de exportações: ${error.message}`);
  return (count ?? 0) < limite;
}

export async function gravarEvento(ctx: Contexto, tipo: TipoEvento | TipoEventoServidor, detalhe: Detalhe): Promise<void> {
  const { error } = await supabaseServidor()
    .from('eventos')
    .insert({ visitante: ctx.visitante, tipo, detalhe, interno: ctx.interno, ip_hash: ctx.ipHash });
  if (error) throw new Error(`gravar evento: ${error.message}`);
}

export async function gravarPedido(ctx: Contexto, pedido: PedidoAlerta): Promise<string> {
  const { data, error } = await supabaseServidor()
    .from('pedidos_alerta')
    .insert({ email: pedido.email, termos: pedido.termos, ufs: pedido.ufs, visitante: ctx.visitante, interno: ctx.interno, ip_hash: ctx.ipHash })
    .select('id')
    .single();
  if (error) throw new Error(`gravar pedido: ${error.message}`);
  return String(data.id);
}

export async function gravarListaEspera(ctx: Contexto, pedido: PedidoListaEspera): Promise<void> {
  const { error } = await supabaseServidor()
    .from('lista_espera')
    .insert({ email: pedido.email, plano: pedido.plano, visitante: ctx.visitante, interno: ctx.interno, ip_hash: ctx.ipHash });
  if (error) throw new Error(`gravar lista de espera: ${error.message}`);
}
