'use client';

import { useEffect, useState } from 'react';
import { normalizarCnpj } from '@/lib/cnpj';
import { UFS_ORDENADAS } from '@/lib/filtros';
import { Lupa, PinoMini, Seta } from './Icones';

type Props = {
  q: string;
  uf: string;
  carregando: boolean;
  /** Filtros valendo (botão "Filtros (n)" do celular). */
  filtrosAtivos: number;
  aoBuscar: (q: string, uf: string) => void;
  /** O texto digitado é um CNPJ válido: consulta a empresa em vez de buscar o texto. */
  aoCnpj: (cnpj: string) => void;
  aoAbrirFiltros: () => void;
};

/**
 * Campo aceita o que a empresa vende ou o CNPJ (CNPJ válido consulta a empresa: aoCnpj). Computador: campo + local ("Todo o Brasil" ou UF) + "Buscar no mapa", numa barra só.
 * Celular: só o campo e o botão "Filtros (n)" (a UF e os outros filtros ficam na folha de Filtros).
 */
export function BuscaPrincipal({ q, uf, carregando, filtrosAtivos, aoBuscar, aoCnpj, aoAbrirFiltros }: Props) {
  const [texto, setTexto] = useState(q);
  const [local, setLocal] = useState(uf);
  useEffect(() => setLocal(uf), [uf]);
  // A busca pode mudar fora do campo (voltar do edital restaura o termo): o campo acompanha.
  useEffect(() => setTexto(q), [q]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const cnpj = normalizarCnpj(texto);
        if (cnpj) aoCnpj(cnpj);
        else aoBuscar(texto, local);
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="q" className="sr-only text-[13px] font-semibold lg:not-sr-only">
        O que sua empresa vende? Ou digite o CNPJ
      </label>
      <div className="flex gap-2 lg:items-center lg:gap-0 lg:rounded-md lg:border lg:border-line-strong lg:bg-raised lg:p-1.5">
        <div className="relative flex min-w-0 flex-1 items-center">
          {/* A lupa também envia (no celular é o único botão de busca; Enter também envia). */}
          <button
            type="submit"
            aria-label="Buscar"
            disabled={carregando}
            className="absolute left-0 flex size-11 items-center justify-center rounded-sm text-ink-muted disabled:opacity-60 lg:left-1 lg:size-9"
          >
            <Lupa className="size-[18px]" />
          </button>
          <input
            id="q"
            type="search"
            enterKeyHint="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que você vende ou o CNPJ"
            autoComplete="off"
            maxLength={100}
            className="h-11 w-full rounded-sm border border-line-strong bg-raised pl-11 pr-3 lg:border-0 lg:bg-transparent lg:pl-10"
          />
        </div>
        <button
          type="button"
          onClick={aoAbrirFiltros}
          aria-haspopup="dialog"
          className="h-11 shrink-0 rounded-sm border border-line-strong bg-raised px-3.5 text-sm font-semibold lg:hidden"
        >
          {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : 'Filtros'}
        </button>
        <label className="relative hidden h-11 min-w-0 items-center border-l border-line lg:flex lg:flex-none">
          <span className="sr-only">Onde</span>
          <PinoMini className="pointer-events-none absolute left-3 h-4 w-3" />
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-full w-auto appearance-none bg-transparent pl-9 pr-8 text-sm font-semibold [&>option]:bg-raised [&>option]:text-ink"
          >
            <option value="">Todo o Brasil</option>
            {UFS_ORDENADAS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <Seta className="pointer-events-none absolute right-2.5 size-4 text-ink-muted" />
        </label>
        <button
          type="submit"
          disabled={carregando}
          className="hidden h-11 shrink-0 rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin disabled:opacity-60 lg:ml-1.5 lg:block"
        >
          {carregando ? 'Buscando…' : 'Buscar no mapa'}
        </button>
      </div>
    </form>
  );
}
