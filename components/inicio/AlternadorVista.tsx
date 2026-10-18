'use client';

import type { Vista } from '@/lib/urlBusca';
import { IconeLista, IconeMapa } from './Icones';

const OPCOES: ReadonlyArray<{ vista: Vista; rotulo: string }> = [
  { vista: 'lista', rotulo: 'Lista' },
  { vista: 'mapa', rotulo: 'Mapa' },
];

/** Lista | Mapa no topo dos resultados (computador e celular). Trocar não busca de novo nem conta como busca. */
export function AlternadorVista({ vista, aoMudar }: { vista: Vista; aoMudar: (v: Vista) => void }) {
  return (
    <div role="group" aria-label="Ver resultados em" className="flex w-full gap-1 rounded-md bg-sunken p-1 lg:w-auto">
      {OPCOES.map((o) => (
        <button
          key={o.vista}
          type="button"
          aria-pressed={vista === o.vista}
          onClick={() => {
            if (vista !== o.vista) aoMudar(o.vista);
          }}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold lg:h-9 lg:flex-none ${
            vista === o.vista ? 'bg-raised shadow-sm' : 'text-ink-muted'
          }`}
        >
          {o.vista === 'lista' ? <IconeLista className="size-4" /> : <IconeMapa className="size-4" />}
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
