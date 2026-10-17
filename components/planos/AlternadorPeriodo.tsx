'use client';

import type { Periodo } from '@/lib/planos';

const OPCOES: ReadonlyArray<{ id: Periodo; rotulo: string; extra?: string }> = [
  { id: 'mensal', rotulo: 'Mensal' },
  { id: 'anual', rotulo: 'Anual', extra: '2 meses grátis' },
];

/** Alternador Mensal | Anual (radiogroup). Alvos de toque de 44 px. */
export function AlternadorPeriodo({ periodo, onChange }: { periodo: Periodo; onChange: (p: Periodo) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Período de cobrança"
      className="inline-flex max-w-full self-start rounded-md border border-line-strong bg-sunken p-1"
    >
      {OPCOES.map((o) => {
        const ativo = o.id === periodo;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.id)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm px-4 text-sm font-semibold ${
              ativo ? 'bg-pin text-on-pin' : 'text-ink hover:bg-raised'
            }`}
          >
            {o.rotulo}
            {o.extra ? <span className={`text-[12px] font-semibold ${ativo ? 'text-on-pin' : 'text-ouro-strong'}`}>· {o.extra}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
