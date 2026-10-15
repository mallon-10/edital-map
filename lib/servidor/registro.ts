import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import type { Detalhe, PedidoAlerta, TipoEvento } from '../eventos';
import { supabaseServidor } from './supabase';

export const COOKIE_VISITANTE = 'em_visitante';
export const COOKIE_INTERNO = 'em_interno';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OPCOES_COOKIE = {
  maxAge: 60 * 60 * 24 * 365,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export type Contexto = { visitante: string; interno: boolean; ipHash: string | null };

/** Lê (ou cria) o visitante anônimo, a marca de interno e o hash do IP. Só em rotas (pode gravar cookie). */
export async function contexto(): Promise<Contexto> {
  const c = await cookies();
  const h = await headers();
  let visitante = c.get(COOKIE_VISITANTE)?.value ?? '';
  if (!UUID.test(visitante)) {
    visitante = randomUUID();
    c.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  }
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const sal = process.env.IP_SAL;
  const ipHash = ip && sal ? createHash('sha256').update(`${sal}:${ip}`).digest('hex') : null;
  return { visitante, interno: c.get(COOKIE_INTERNO)?.value === '1', ipHash };
}

export async function marcarInterno(): Promise<void> {
  (await cookies()).set(COOKIE_INTERNO, '1', OPCOES_COOKIE);
}

export async function dentroDoLimite(tabela: 'eventos' | 'pedidos_alerta', ipHash: string | null, limite: number): Promise<boolean> {
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

export async function gravarEvento(ctx: Contexto, tipo: TipoEvento | 'pediu_alerta', detalhe: Detalhe): Promise<void> {
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
