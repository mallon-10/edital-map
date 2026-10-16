'use client';

import { useEffect, useState } from 'react';
import { UFS_BRASIL } from '@/lib/eventos';
import { UFS_COBERTAS } from '@/lib/filtros';
import { Lupa, PinoMini, Seta } from './Icones';

type Props = { q: string; uf: string; carregando: boolean; aoBuscar: (q: string, uf: string) => void };

const EM_BREVE = UFS_BRASIL.filter((u) => !(UFS_COBERTAS as readonly string[]).includes(u)).sort();

/** "O que sua empresa vende?" + local ("Todo o Brasil" ou UF) + "Buscar no mapa". No computador é uma barra só. */
export function BuscaPrincipal({ q, uf, carregando, aoBuscar }: Props) {
  const [texto, setTexto] = useState(q);
  const [local, setLocal] = useState(uf);
  useEffect(() => setLocal(uf), [uf]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        aoBuscar(texto, local);
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="q" className="sr-only text-[13px] font-semibold lg:not-sr-only">
        O que sua empresa vende?
      </label>
      <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:items-center lg:gap-0 lg:rounded-md lg:border lg:border-line-strong lg:bg-raised lg:p-1.5">
        <div className="relative flex min-w-0 basis-full items-center lg:basis-auto lg:flex-1">
          <Lupa className="pointer-events-none absolute left-3 size-[18px] text-ink-muted" />
          <input
            id="q"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que sua empresa vende? Ex.: EPI e uniformes"
            autoComplete="off"
            maxLength={100}
            className="h-11 w-full rounded-sm border border-line-strong bg-raised pl-10 pr-3 lg:border-0 lg:bg-transparent"
          />
        </div>
        <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-sm border border-line-strong bg-raised lg:flex-none lg:rounded-none lg:border-0 lg:border-l lg:border-line">
          <span className="sr-only">Onde</span>
          <PinoMini className="pointer-events-none absolute left-3 h-4 w-3" />
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-full w-full appearance-none bg-transparent pl-9 pr-8 text-sm font-semibold lg:w-auto"
          >
            <option value="">Todo o Brasil</option>
            {UFS_COBERTAS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <optgroup label="Em breve">
              {EM_BREVE.map((u) => (
                <option key={u} value={u} disabled>
                  {u} · em breve
                </option>
              ))}
            </optgroup>
          </select>
          <Seta className="pointer-events-none absolute right-2.5 size-4 text-ink-muted" />
        </label>
        <button
          type="submit"
          disabled={carregando}
          className="h-11 shrink-0 rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin disabled:opacity-60 lg:ml-1.5"
        >
          {carregando ? 'Buscando…' : 'Buscar no mapa'}
        </button>
      </div>
    </form>
  );
}
