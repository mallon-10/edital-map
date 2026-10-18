'use client';

import { useEffect } from 'react';
import { medir } from '@/lib/cliente/medir';
import type { Conversao } from '@/lib/medicao';

/** Dispara uma conversão do Google Ads ao aparecer na tela (componentes de servidor não rodam o gtag). */
export function Medir({ conversao, chave, valorCentavos, transacao, email }: {
  conversao: Conversao; chave: 'dia' | string; valorCentavos?: number; transacao?: string; email?: string;
}) {
  useEffect(() => {
    // A tag carrega depois da página: espera um pouco por ela.
    const id = window.setTimeout(() => medir(conversao, { chave, valorCentavos, transacao, email }), 1500);
    return () => window.clearTimeout(id);
  }, [conversao, chave, valorCentavos, transacao, email]);
  return null;
}
