import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { ehDono, segredoDoEndereco, valorCookieDono } from '../dono';
import type { Detalhe, PedidoAlerta, PedidoListaEspera, TipoEvento, TipoEventoConta, TipoEventoServidor } from '../eventos';
import { COOKIE_DONO, COOKIE_INTERNO, COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie, visitanteValido } from '../visitante';
import { supabaseServidor } from './supabase';

export { COOKIE_INTERNO, COOKIE_VISITANTE };

/**
 * `interno`: fora das métricas (cookie em_interno, ou o dono). `dono`: o dono confiável (cookie em_dono assinado com
 * INTERNO_SEGREDO, lib/dono.ts): sem limites e com o Pro. O em_interno sozinho não libera nada com o pagamento ligado.
 */
export type Contexto = { visitante: string; interno: boolean; dono: boolean; ipHash: string | null };

type LeitorCookies = { get(nome: string): { value: string } | undefined };

function marcas(c: LeitorCookies): { interno: boolean; dono: boolean } {
  const dono = ehDono(c.get(COOKIE_DONO)?.value, process.env.INTERNO_SEGREDO);
  return { interno: dono || c.get(COOKIE_INTERNO)?.value === '1', dono };
}

/** Hash do IP com o sal do servidor (IP_SAL). Sem sal ou sem IP: null (os limites por IP não valem). */
export function hashDoIp(h: { get(nome: string): string | null }): string | null {
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const sal = process.env.IP_SAL;
  return ip && sal ? createHash('sha256').update(`${sal}:${ip}`).digest('hex') : null;
}

/** Lê (ou cria) o visitante anônimo, a marca de interno e o hash do IP. Só em rotas (pode gravar cookie). */
export async function contexto(): Promise<Contexto> {
  const c = await cookies();
  const { visitante, novo } = visitanteDoCookie(c.get(COOKIE_VISITANTE)?.value, randomUUID);
  if (novo) c.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  return { visitante, ...marcas(c), ipHash: hashDoIp(await headers()) };
}

/**
 * Contexto para páginas (componente de servidor não grava cookie; o proxy.ts já garantiu em_visitante).
 * null = sem visitante válido: a página não conta uso.
 */
export async function contextoDaPagina(): Promise<Contexto | null> {
  const c = await cookies();
  const visitante = c.get(COOKIE_VISITANTE)?.value;
  if (!visitanteValido(visitante)) return null;
  return { visitante, ...marcas(c), ipHash: hashDoIp(await headers()) };
}

/**
 * Marca o navegador como interno (fora das métricas). Com o segredo do dono (`/sobre#dono=<segredo>`, que nunca vai no
 * endereço pedido ao servidor), grava também o cookie do dono. Devolve se o navegador virou dono.
 */
export async function marcarInterno(valor?: string): Promise<boolean> {
  const c = await cookies();
  c.set(COOKIE_INTERNO, '1', OPCOES_COOKIE);
  const segredo = process.env.INTERNO_SEGREDO;
  if (!segredoDoEndereco(valor, segredo)) return false;
  c.set(COOKIE_DONO, valorCookieDono(segredo as string), OPCOES_COOKIE);
  return true;
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

export async function gravarEvento(ctx: Contexto, tipo: TipoEvento | TipoEventoServidor | TipoEventoConta, detalhe: Detalhe): Promise<void> {
  const { error } = await supabaseServidor()
    .from('eventos')
    .insert({ visitante: ctx.visitante, tipo, detalhe, interno: ctx.interno, ip_hash: ctx.ipHash });
  if (error) throw new Error(`gravar evento: ${error.message}`);
}

/**
 * Grava o evento só se este visitante ainda não tem um do mesmo tipo (ex.: onboarding_iniciado: recarregar ou voltar
 * à página não infla o funil). O visitante (cookie em_visitante, 1 ano) é o navegador: na prática, uma vez por conta;
 * a mesma conta em outro navegador conta de novo. Usa o índice eventos_tipo_idx (tipo raro). true = gravou.
 */
export async function gravarEventoUmaVez(ctx: Contexto, tipo: TipoEventoConta, detalhe: Detalhe): Promise<boolean> {
  const { data, error } = await supabaseServidor().from('eventos').select('id').eq('tipo', tipo).eq('visitante', ctx.visitante).limit(1);
  if (error) throw new Error(`ler evento: ${error.message}`);
  if (data && data.length > 0) return false;
  await gravarEvento(ctx, tipo, detalhe);
  return true;
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
    .insert({ email: pedido.email, plano: pedido.plano, periodo: pedido.periodo, visitante: ctx.visitante, interno: ctx.interno, ip_hash: ctx.ipHash });
  if (error) throw new Error(`gravar lista de espera: ${error.message}`);
}
