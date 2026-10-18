'use client';

import { useState } from 'react';

/** Chave de acesso com botão Copiar: usada em até 3 navegadores pela página /assinatura. */
export function ChaveAcesso({ chave }: { chave: string }) {
  const [copiada, setCopiada] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-4">
      <span className="text-[13px] font-semibold text-ink-muted">Sua chave de acesso</span>
      <div className="flex flex-wrap items-center gap-3">
        <code className="font-mono text-xl font-bold tracking-wider text-ink">{chave}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              ?.writeText(chave)
              .then(() => setCopiada(true))
              .catch(() => setCopiada(false));
          }}
          className="inline-flex h-9 items-center rounded-sm border border-line-strong bg-raised px-3 text-sm font-semibold hover:bg-sunken"
        >
          {copiada ? 'Copiada' : 'Copiar'}
        </button>
      </div>
      <p className="text-[13px] text-ink-muted">
        Guarde esta chave. Para usar o plano em outro navegador ou aparelho (até 3), abra editalmap.com.br/assinatura e cole a chave.
      </p>
    </div>
  );
}
