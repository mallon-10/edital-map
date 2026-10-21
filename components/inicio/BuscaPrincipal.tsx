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
 * Campo aceita o que a empresa vende ou o CNPJ (CNPJ válido consulta a empresa: aoCnpj). Computador: uma pílula com o campo, o local
 * ("Todo o Brasil" ou UF) e "Buscar". Celular: o campo em pílula e o botão "Filtros (n)" (a UF e os outros filtros ficam na folha).
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
      <label htmlFor="q" className="sr-only">
        O que sua empresa vende? Ou digite o CNPJ
      </label>
      <div className="flex gap-2 lg:h-[60px] lg:items-center lg:gap-0 lg:rounded-full lg:border lg:border-line lg:bg-raised lg:py-1.5 lg:pl-2 lg:pr-2">
        <div className="relative flex min-w-0 flex-1 items-center">
          {/* A lupa também envia (no celular é o único botão de busca; Enter também envia). */}
          <button
            type="submit"
            aria-label="Buscar"
            disabled={carregando}
            className="absolute left-0.5 flex size-11 items-center justify-center rounded-full text-ink-muted disabled:opacity-60 lg:left-1 lg:size-9"
          >
            <Lupa className="size-[18px]" />
          </button>
          <input
            id="q"
            type="search"
            enterKeyHint="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que sua empresa vende? Ou o CNPJ"
            autoComplete="off"
            maxLength={100}
            className="h-12 w-full rounded-full border border-line bg-raised pl-12 pr-4 text-[16px] lg:h-11 lg:border-0 lg:bg-transparent lg:pl-11 lg:text-[17px]"
          />
        </div>
        <button
          type="button"
          onClick={aoAbrirFiltros}
          aria-haspopup="dialog"
          className="h-12 shrink-0 rounded-full border border-line-strong bg-raised px-4 text-sm font-semibold lg:hidden"
        >
          {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : 'Filtros'}
        </button>
        <label className="relative hidden h-9 min-w-0 items-center border-l border-line lg:flex lg:flex-none">
          <span className="sr-only">Onde</span>
          <PinoMini className="pointer-events-none absolute left-3 h-4 w-3" />
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-11 w-auto appearance-none rounded-full bg-transparent pl-9 pr-8 text-[15px] font-semibold [&>option]:bg-raised [&>option]:text-ink"
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
          className="hidden h-11 shrink-0 rounded-full bg-pin px-6 text-[15px] font-semibold text-on-pin disabled:opacity-60 lg:ml-1.5 lg:block"
        >
          {carregando ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
    </form>
  );
}
