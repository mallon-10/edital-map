'use client';

import type { CSSProperties, ReactNode } from 'react';

/** Altura da gaveta recolhida no celular: a alça ("Ver lista"), a contagem e o alternador de prazo. */
export const ALTURA_GAVETA_RECOLHIDA = 168;

type Props = { aberta: boolean; aoAlternar: () => void; children: ReactNode };

/** Celular: painel fixo embaixo que abre e fecha. A partir de `lg`: coluna normal da grade. */
export function GavetaCelular({ aberta, aoAlternar, children }: Props) {
  return (
    <section
      aria-label="Lista de editais"
      style={{ '--altura-recolhida': `${ALTURA_GAVETA_RECOLHIDA}px` } as CSSProperties}
      className={`fixed inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[20px] bg-raised shadow-[0_-6px_24px_rgba(12,35,64,.12)] transition-[height] lg:static lg:z-auto lg:h-auto lg:min-h-0 lg:rounded-none lg:bg-transparent lg:shadow-none ${
        aberta ? 'h-[85dvh]' : 'h-[var(--altura-recolhida)]'
      }`}
    >
      <button type="button" onClick={aoAlternar} aria-expanded={aberta} className="flex shrink-0 flex-col items-center gap-2 px-4 pb-2 pt-2 lg:hidden">
        <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
        <span className="text-sm font-semibold">{aberta ? 'Ver mapa' : 'Ver lista'}</span>
      </button>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 lg:px-0 lg:pb-0">{children}</div>
    </section>
  );
}
