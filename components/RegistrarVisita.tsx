'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import { pistasDaEntrada } from '@/lib/cliente/visita';
import { paginaDoCaminho } from '@/lib/paginaVista';

// Primeira página deste carregamento: só ela pode ser a entrada (as outras são navegação dentro do site).
let primeira = true;
// Último caminho gravado: o efeito repetido do modo estrito (dev) não grava duas vezes.
let ultimo: string | null = null;

/** Grava pagina_vista a cada troca de página (só o caminho; parâmetros da busca não contam). No layout. */
export function RegistrarVisita() {
  const caminho = usePathname();
  useEffect(() => {
    if (!caminho || caminho === ultimo || !paginaDoCaminho(caminho)) return;
    ultimo = caminho;
    const entrada = primeira ? pistasDaEntrada(document.referrer, window.location.href) : null;
    primeira = false;
    registrar('pagina_vista', { pagina: caminho, ...(entrada ?? { entrada: false }) });
  }, [caminho]);
  return null;
}
