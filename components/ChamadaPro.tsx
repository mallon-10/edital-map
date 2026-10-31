'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { rastrear } from '@/lib/cliente/rastrear';

type Props = { href: string; origem: string; segmento?: string | null; resultados?: number | null; className?: string; children: ReactNode };

/** Chamada para o Pro: o link de sempre, mais o `pro_cta_clicked` com a origem. */
export function ChamadaPro({ href, origem, segmento, resultados, className, children }: Props) {
  return (
    <Link href={href} prefetch={false} onClick={() => rastrear('pro_cta_clicked', { origem, segmento, resultados })} className={className}>
      {children}
    </Link>
  );
}

/** Página inteira é a oferta (vitrine do Radar e dos Alertas): `pro_offer_viewed` ao abrir. */
export function OfertaVista({ origem, segmento }: { origem: string; segmento?: string | null }) {
  useEffect(() => {
    rastrear('pro_offer_viewed', { origem, segmento });
  }, [origem, segmento]);
  return null;
}
