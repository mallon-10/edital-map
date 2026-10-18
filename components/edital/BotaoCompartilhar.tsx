'use client';

import { useEffect, useState } from 'react';
import { LINK_COPIADO, linkDoEdital, modoCompartilhar } from '@/lib/compartilhar';

/** Compartilhar: folha do sistema no celular; no computador copia o link e avisa "Link copiado". */
export function BotaoCompartilhar({ titulo, slug }: { titulo: string; slug: string }) {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function compartilhar() {
    const url = linkDoEdital(window.location.origin, slug);
    const modo = modoCompartilhar({
      temShare: typeof navigator.share === 'function',
      celular: window.matchMedia('(pointer: coarse)').matches,
      temCopiar: typeof navigator.clipboard?.writeText === 'function',
    });
    if (modo === 'nativo') {
      try {
        await navigator.share({ title: titulo, url });
      } catch {
        // a pessoa fechou a folha: nada a fazer
      }
      return;
    }
    if (modo === 'copiar') {
      try {
        await navigator.clipboard.writeText(url);
        setAviso(LINK_COPIADO);
        return;
      } catch {
        // sem permissão: mostra o link para copiar à mão
      }
    }
    setAviso(`Copie o link: ${url}`);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={compartilhar}
        className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
      >
        Compartilhar
      </button>
      <span
        role="status"
        aria-live="polite"
        className={aviso ? 'absolute left-0 top-full z-20 mt-1 w-max max-w-[80vw] break-all rounded-sm bg-ink px-2 py-1 text-xs text-surface' : 'sr-only'}
      >
        {aviso ?? ''}
      </span>
    </span>
  );
}
