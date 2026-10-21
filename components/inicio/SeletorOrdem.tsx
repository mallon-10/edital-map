'use client';

import { ORDENS } from '@/lib/filtros';
import type { Ordem } from '@/lib/tipos';
import { Seta } from './Icones';

type Props = { ordem: Ordem; temTermo: boolean; aoMudar: (o: Ordem) => void };

/** Ordenação da lista ("Maior relevância" só aparece com termo de busca). Trocar não conta como busca. */
export function SeletorOrdem({ ordem, temTermo, aoMudar }: Props) {
  return (
    <label className="relative flex shrink-0 items-center">
      <span className="sr-only">Ordenar por</span>
      <select
        value={ordem}
        onChange={(e) => aoMudar(e.target.value as Ordem)}
        className="h-11 appearance-none rounded-full border border-line-strong bg-raised pl-4 pr-9 text-[14px] font-semibold lg:h-12 lg:text-[15px] [&>option]:bg-raised [&>option]:text-ink"
      >
        {ORDENS.filter((o) => temTermo || o.id !== 'relevancia').map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <Seta className="pointer-events-none absolute right-3 size-4 text-ink" />
    </label>
  );
}
