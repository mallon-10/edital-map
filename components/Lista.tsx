'use client';

import { numero } from '@/lib/formato';
import type { Cidade, ResultadoBusca } from '@/lib/tipos';
import { CardEdital } from './CardEdital';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  cidade: Cidade | null;
  carregando: boolean;
  erro: string | null;
  aoTirarCidade: () => void;
  aoCarregarMais: () => void;
};

export function Lista({ resultado, agora, cidade, carregando, erro, aoTirarCidade, aoCarregarMais }: Props) {
  const { total, editais } = resultado;
  return (
    <>
      <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-base font-bold">
          {carregando && editais.length === 0 ? 'Buscando…' : `${numero(total)} ${total === 1 ? 'edital aberto' : 'editais abertos'}`}
        </h2>
        {cidade ? (
          <span className="inline-flex h-8 items-center gap-1 rounded-full bg-ink pl-3 pr-1 text-[13px] font-semibold text-surface">
            {cidade.nome}/{cidade.uf}
            <button type="button" onClick={aoTirarCidade} aria-label="Tirar filtro de cidade" className="size-6 text-base">
              ×
            </button>
          </span>
        ) : null}
      </div>
      {erro ? (
        <p role="alert" className="mb-3 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{erro}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 md:max-h-[72vh]">
        {editais.length === 0 && !carregando ? (
          <p className="px-2 py-6 text-ink-muted">Nenhum edital aberto para essa busca. Tente outro termo ou tire o filtro de prazo.</p>
        ) : null}
        {editais.map((e) => (
          <CardEdital key={e.id} edital={e} agora={agora} />
        ))}
        {editais.length < total ? (
          <button
            type="button"
            onClick={aoCarregarMais}
            disabled={carregando}
            className="h-11 shrink-0 rounded-sm border border-line-strong bg-raised text-sm font-semibold disabled:opacity-60"
          >
            {carregando ? 'Carregando…' : 'Carregar mais'}
          </button>
        ) : null}
      </div>
    </>
  );
}
