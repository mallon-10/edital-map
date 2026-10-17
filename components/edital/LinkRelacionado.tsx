'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { registrar } from '@/lib/cliente/registrar';

type Props = { href: string; origem: string; className?: string; children: ReactNode };

/** Card de edital parecido: abre a página dele e registra o uso (com o edital de origem). Sem prefetch, para não consultar 6 editais a cada visita. */
export function LinkRelacionado({ href, origem, className, children }: Props) {
  const marcar = () => registrar('usou_recurso', { recurso: 'relacionados_clique', edital: origem });
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={marcar}
      onAuxClick={(e) => {
        if (e.button === 1) marcar();
      }}
    >
      {children}
    </Link>
  );
}
