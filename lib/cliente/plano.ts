import { useSyncExternalStore } from 'react';
import type { PlanoDaPagina } from '../planos';

let atual: PlanoDaPagina | null = null;
const ouvintes = new Set<() => void>();

/** Guarda o plano do visitante (vindo do servidor com a página ou de /api/plano) para as próximas páginas. */
export function publicarPlano(novo: PlanoDaPagina): void {
  if (atual && atual.plano === novo.plano && atual.dono === novo.dono) return;
  atual = novo;
  for (const ouvir of ouvintes) ouvir();
}

export function planoConhecido(): PlanoDaPagina | null {
  return atual;
}

function assinar(ouvir: () => void): () => void {
  ouvintes.add(ouvir);
  return () => {
    ouvintes.delete(ouvir);
  };
}

/** Plano conhecido no navegador; no servidor (e na hidratação) é sempre null. */
export function usePlano(): PlanoDaPagina | null {
  return useSyncExternalStore(assinar, planoConhecido, () => null);
}
