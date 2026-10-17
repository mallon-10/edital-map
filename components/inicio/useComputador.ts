'use client';

import { useSyncExternalStore } from 'react';

/** A partir de lg (1024 px): três colunas, card que seleciona. Abaixo: celular. */
const CONSULTA = '(min-width: 1024px)';

function assinar(avisar: () => void) {
  const m = window.matchMedia(CONSULTA);
  m.addEventListener('change', avisar);
  return () => m.removeEventListener('change', avisar);
}

/** Verdadeiro a partir de lg. No servidor (e na hidratação) é falso; o navegador corrige logo depois. */
export function useComputador(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
