'use client';

import { useState } from 'react';

export type ValoresBusca = { q: string; uf: string; seteDias: boolean };

type Props = { inicial: ValoresBusca; carregando: boolean; aoBuscar: (v: ValoresBusca) => void };

/** Celular em duas linhas (campo; depois estado, prazo e botão); computador em uma linha só. */
export function Busca({ inicial, carregando, aoBuscar }: Props) {
  const [v, setV] = useState(inicial);
  return (
    <form
      role="search"
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        aoBuscar(v);
      }}
    >
      <label htmlFor="q" className="sr-only">O que sua empresa vende?</label>
      <input
        id="q"
        value={v.q}
        onChange={(e) => setV({ ...v, q: e.target.value })}
        placeholder="O que sua empresa vende? Ex.: EPI e uniformes"
        autoComplete="off"
        maxLength={100}
        className="h-11 w-full min-w-0 rounded-sm border border-line-strong bg-raised px-3 md:w-auto md:flex-[1_1_260px]"
      />
      <label htmlFor="uf" className="sr-only">Estado</label>
      <select
        id="uf"
        value={v.uf}
        onChange={(e) => setV({ ...v, uf: e.target.value })}
        className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-raised px-2 md:flex-none md:px-3"
      >
        <option value="">Todas as UFs</option>
        <option>SC</option>
        <option>PR</option>
        <option>RS</option>
      </select>
      <label className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm border border-line-strong bg-raised px-2.5 text-sm md:px-3">
        <input
          type="checkbox"
          aria-label="Encerram em 7 dias"
          checked={v.seteDias}
          onChange={(e) => setV({ ...v, seteDias: e.target.checked })}
          className="size-4 accent-[#0b6b53]"
        />
        <span className="md:hidden" aria-hidden="true">7 dias</span>
        <span className="hidden md:inline" aria-hidden="true">Encerram em 7 dias</span>
      </label>
      <button
        type="submit"
        disabled={carregando}
        className="h-11 shrink-0 rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin disabled:opacity-60 md:w-[8.25rem] md:px-0"
      >
        {carregando ? (
          'Buscando…'
        ) : (
          <>
            <span className="md:hidden">Buscar</span>
            <span className="hidden md:inline">Buscar editais</span>
          </>
        )}
      </button>
    </form>
  );
}
