'use client';

import { useEffect } from 'react';
import { guardarRascunhoAlerta } from '@/lib/cliente/rascunhoAlerta';
import type { RascunhoRadar } from '@/lib/radar';

/** Guarda os filtros da prévia neste navegador, para o onboarding depois da compra abrir preenchido. */
export function GuardarRascunho({ rascunho }: { rascunho: RascunhoRadar }) {
  useEffect(() => {
    if (rascunho.termos.length) guardarRascunhoAlerta(rascunho);
  }, [rascunho]);
  return null;
}
