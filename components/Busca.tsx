'use client';

import { useState } from 'react';

export type ValoresBusca = { q: string; uf: string; seteDias: boolean };

export function Busca({ inicial, aoBuscar }: { inicial: ValoresBusca; aoBuscar: (v: ValoresBusca) => void }) {
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
        className="h-11 min-w-0 flex-[1_1_260px] rounded-sm border border-line-strong bg-raised px-3"
      />
      <label htmlFor="uf" className="sr-only">Estado</label>
      <select
        id="uf"
        value={v.uf}
        onChange={(e) => setV({ ...v, uf: e.target.value })}
        className="h-11 rounded-sm border border-line-strong bg-raised px-3"
      >
        <option value="">Todas as UFs</option>
        <option>SC</option>
        <option>PR</option>
        <option>RS</option>
      </select>
      <label className="flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-raised px-3 text-sm">
        <input
          type="checkbox"
          checked={v.seteDias}
          onChange={(e) => setV({ ...v, seteDias: e.target.checked })}
          className="size-4 accent-[#0b6b53]"
        />
        Encerram em 7 dias
      </label>
      <button type="submit" className="h-11 rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
        Buscar editais
      </button>
    </form>
  );
}
