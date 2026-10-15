'use client';

import { useState, type ReactNode } from 'react';

export function GavetaCelular({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <section
      aria-label="Lista de editais"
      className={`fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[20px] bg-raised shadow-[0_-6px_24px_rgba(12,35,64,.12)] transition-[height] md:static md:z-auto md:h-auto md:rounded-none md:bg-transparent md:shadow-none ${aberta ? 'h-[85dvh]' : 'h-[38dvh]'}`}
    >
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        aria-expanded={aberta}
        className="flex flex-col items-center gap-2 px-4 pt-2 pb-3 md:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
        <span className="text-sm font-semibold">{aberta ? 'Ver mapa' : 'Ver lista inteira'}</span>
      </button>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 md:px-0">{children}</div>
    </section>
  );
}
