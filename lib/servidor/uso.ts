import 'server-only';
import { createHash } from 'node:crypto';
import { hojeBrasilia, inicioDoDia } from '@/worker/datas';
import { combinacaoBusca, LIMITES_PLANO, type Limite, type Plano, type TipoUso, type UsoHoje } from '../limites';
import type { FiltrosBusca } from '../tipos';
import { pagamentoLigado, planoAtual } from './plano';
import { gravarEvento, type Contexto } from './registro';
import { supabaseServidor } from './supabase';

/** Decisão do uso. `usados` = quantos deste tipo hoje; null quando não contou (busca vazia, interno, sem visitante, banco fora). */
export type Decisao = { permitido: true; usados: number | null } | { permitido: false; limite: Limite; plano: Plano };

const LIBERADO: Decisao = { permitido: true, usados: null };

/** Chave gravada em uso_diario para uma combinação de busca (sha256, 32 caracteres hex). */
export function chaveDaBusca(combinacao: string): string {
  return createHash('sha256').update(combinacao).digest('hex').slice(0, 32);
}

/** Início do dia de Brasília (ISO UTC): a virada do limite do grátis. */
export function inicioDoDiaDeBrasilia(agora: Date): string {
  return inicioDoDia(hojeBrasilia(agora));
}

/** Sem limite: o dono; e o interno enquanto o pagamento está desligado (como antes da cobrança). */
export function semLimite(ctx: Contexto): boolean {
  return ctx.dono || (ctx.interno && !pagamentoLigado());
}

async function registrar(ctx: Contexto, tipo: TipoUso, chave: string, plano: Plano): Promise<Decisao> {
  const maximo = LIMITES_PLANO[plano][tipo];
  const { data, error } = await supabaseServidor()
    .rpc('registrar_uso', { p_visitante: ctx.visitante, p_tipo: tipo, p_chave: chave, p_limite: maximo })
    .single();
  if (error) throw new Error(`registrar_uso: ${error.message}`);
  const linha = (data ?? {}) as { permitido?: unknown; usados?: unknown };
  const usados = Number(linha.usados ?? 0);
  return linha.permitido === false
    ? { permitido: false, limite: { tipo, usados, maximo }, plano }
    : { permitido: true, usados };
}

/** Grava limite_atingido na primeira vez do dia (por tipo) em que o limite bloqueia. Falha só vai para o log. */
export async function avisarLimite(ctx: Contexto, tipo: TipoUso, agora: Date = new Date()): Promise<void> {
  try {
    const { count, error } = await supabaseServidor()
      .from('eventos')
      .select('id', { count: 'exact', head: true })
      .eq('visitante', ctx.visitante)
      .eq('tipo', 'limite_atingido')
      .eq('detalhe->>tipo', tipo)
      .gte('criado_em', inicioDoDiaDeBrasilia(agora));
    if (error) throw new Error(error.message);
    if ((count ?? 0) === 0) await gravarEvento(ctx, 'limite_atingido', { tipo });
  } catch (erro) {
    console.error('limite_atingido:', erro);
  }
}

async function decidir(ctx: Contexto | null, tipo: TipoUso, chave: string | null, avisar: boolean): Promise<Decisao> {
  if (!ctx || chave === null || semLimite(ctx)) return LIBERADO;
  let decisao: Decisao;
  try {
    decisao = await registrar(ctx, tipo, chave, await planoAtual(ctx));
  } catch (erro) {
    // O limite é um lembrete: com o banco fora, libera (e a consulta da própria busca provavelmente falha logo depois).
    console.error(erro);
    return LIBERADO;
  }
  if (!decisao.permitido && avisar) await avisarLimite(ctx, tipo);
  return decisao;
}

/**
 * Busca: conta cada combinação nova do dia (lib/limites.ts). `avisar` grava limite_atingido
 * (a lista e a página inicial avisam; o mapa e a exportação, que acompanham a mesma busca, não).
 */
export function decidirBusca(ctx: Contexto | null, f: FiltrosBusca, opcoes: { avisar: boolean }): Promise<Decisao> {
  const combinacao = combinacaoBusca(f);
  return decidir(ctx, 'busca', combinacao === null ? null : chaveDaBusca(combinacao), opcoes.avisar);
}

/** Edital: conta cada slug novo do dia (reabrir não conta). */
export function decidirEdital(ctx: Contexto | null, slug: string): Promise<Decisao> {
  return decidir(ctx, 'edital', slug, true);
}

/** Uso de hoje para a faixa do plano grátis. Interno: sem consulta. Sem visitante ou banco fora: null (a faixa não aparece). */
export async function usoDoDia(ctx: Contexto | null): Promise<UsoHoje | null> {
  if (!ctx) return null;
  if (semLimite(ctx)) return { interno: true, plano: ctx.dono ? 'pro' : 'gratis', buscas: 0, editais: 0 };
  const [{ data, error }, plano] = await Promise.all([
    supabaseServidor().rpc('uso_do_dia', { p_visitante: ctx.visitante }).single(),
    planoAtual(ctx),
  ]);
  if (error) {
    console.error(`uso_do_dia: ${error.message}`);
    return null;
  }
  const linha = (data ?? {}) as { buscas?: unknown; editais?: unknown };
  return { interno: false, plano, buscas: Number(linha.buscas ?? 0), editais: Number(linha.editais ?? 0) };
}
