import { useSyncExternalStore } from 'react';
import type { UsoHoje } from '../limites';

/** Uso completo (vindo do servidor) ou só o que mudou (as buscas usadas devolvidas por /api/busca). */
export type AtualizacaoUso = UsoHoje | { buscas?: number; editais?: number };

/** Junta uma atualização ao uso conhecido. Completa substitui; parcial sem uso conhecido é ignorada (o selo busca /api/uso). */
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

export function usoAtual(): UsoHoje | null {
  return atual;
}

function assinar(ouvir: () => void): () => void {
  ouvintes.add(ouvir);
  return () => {
    ouvintes.delete(ouvir);
  };
}

/** Uso do dia para o selo; no servidor (e na hidratação) é sempre null. */
export function useUso(): UsoHoje | null {
  return useSyncExternalStore(assinar, usoAtual, () => null);
}
