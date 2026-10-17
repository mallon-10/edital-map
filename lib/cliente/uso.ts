import { useSyncExternalStore } from 'react';
import type { UsoHoje } from '../limites';

/** Uso completo (vindo do servidor) ou só o que mudou (as buscas usadas devolvidas por /api/busca). */
export type AtualizacaoUso = UsoHoje | { buscas?: number; editais?: number };

/** Junta uma atualização ao uso conhecido. Completa substitui; parcial sem uso conhecido é ignorada (a faixa busca /api/uso). */
export function mesclarUso(base: UsoHoje | null, novo: AtualizacaoUso): UsoHoje | null {
  if ('interno' in novo) return novo;
  return base ? { ...base, ...novo } : null;
}

let atual: UsoHoje | null = null;
const ouvintes = new Set<() => void>();

export function publicarUso(novo: AtualizacaoUso): void {
  const proximo = mesclarUso(atual, novo);
  if (proximo === null) return;
  atual = proximo;
  for (const ouvir of ouvintes) ouvir();
}

/**
 * Uso que o servidor mandou com a página. Só vale se a loja ainda está vazia; com a loja já preenchida
 * (Voltar traz a página velha do cache do roteador) a loja é mais nova e a faixa deve rebuscar. Devolve true se precisa rebuscar.
 */
export function publicarInicial(inicial: UsoHoje): boolean {
  if (atual !== null) return true;
  publicarUso(inicial);
  return false;
}

export function usoAtual(): UsoHoje | null {
  return atual;
}

function assinar(ouvir: () => void): () => void {
  ouvintes.add(ouvir);
  return () => {
    ouvintes.delete(ouvir);
  };
}

/** Uso do dia para a faixa do plano grátis; no servidor (e na hidratação) é sempre null. */
export function useUso(): UsoHoje | null {
  return useSyncExternalStore(assinar, usoAtual, () => null);
}
