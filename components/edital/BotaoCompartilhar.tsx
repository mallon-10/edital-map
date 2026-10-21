'use client';

import { useEffect, useState } from 'react';
import { AVISO_CURTO_MS, ehAvisoManual, foiCancelamento, LINK_COPIADO, linkDoEdital, modoCompartilhar, prefixoManual } from '@/lib/compartilhar';

/** Compartilhar: folha do sistema no celular; no computador copia o link e avisa "Link copiado". */
export function BotaoCompartilhar({ titulo, slug }: { titulo: string; slug: string }) {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!aviso || ehAvisoManual(aviso)) return; // o link manual fica até fechar
    const t = setTimeout(() => setAviso(null), AVISO_CURTO_MS);
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
        return;
      } catch (e) {
        if (foiCancelamento(e)) return; // a pessoa fechou a folha: nada a fazer
        // outro erro: cai na cópia do link
      }
    }
    if (modo === 'copiar' || (modo === 'nativo' && typeof navigator.clipboard?.writeText === 'function')) {
      try {
        await navigator.clipboard.writeText(url);
        setAviso(LINK_COPIADO);
        return;
      } catch {
        // sem permissão: mostra o link para copiar à mão
      }
    }
    setAviso(`${prefixoManual()}${url}`);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={compartilhar}
        className="inline-flex h-12 items-center rounded-full border border-line-strong bg-raised px-5 text-[15px] font-semibold hover:bg-sunken"
      >
        Compartilhar
      </button>
      <span
        role="status"
        aria-live="polite"
        className={aviso ? 'absolute left-0 top-full z-20 mt-1 w-max max-w-[80vw] break-all rounded-sm bg-ink px-2 py-1 text-xs text-surface' : 'sr-only'}
      >
        {aviso ?? ''}
        {aviso && ehAvisoManual(aviso) ? (
          <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso" className="ml-2 font-bold underline">
            Fechar
          </button>
        ) : null}
      </span>
    </span>
  );
}
