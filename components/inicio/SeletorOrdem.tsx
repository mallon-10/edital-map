'use client';

import { ORDENS } from '@/lib/filtros';
import type { Ordem } from '@/lib/tipos';

type Props = { ordem: Ordem; temTermo: boolean; aoMudar: (o: Ordem) => void };

/** Ordenação da lista ("Maior relevância" só aparece com termo de busca). Trocar não conta como busca. */
export function SeletorOrdem({ ordem, temTermo, aoMudar }: Props) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-[13px]">
      <span className="text-ink-muted">Ordenar por</span>
      <select
        value={ordem}
        onChange={(e) => aoMudar(e.target.value as Ordem)}
        className="h-11 rounded-sm border border-line-strong bg-raised px-2 text-[13px] font-semibold lg:h-9 [&>option]:bg-raised [&>option]:text-ink"
      >
        {ORDENS.filter((o) => temTermo || o.id !== 'relevancia').map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
