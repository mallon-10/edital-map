'use client';

import { useEffect, useRef } from 'react';
import { moedaCurta, numero } from '@/lib/formato';
import type { Painel } from '@/lib/painel';
import type { EditalResumo, ResultadoBusca } from '@/lib/tipos';
import { CardCompacto } from './CardCompacto';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  painel: Painel;
  seteDias: boolean;
  selecionadoId: string | null;
  carregandoLista: boolean;
  carregandoMais: boolean;
  erro: string | null;
  /** No celular, com a gaveta recolhida só a contagem e o alternador aparecem. */
  recolhida: boolean;
  aoSelecionar: (e: EditalResumo) => void;
  aoMudarPrazo: (seteDias: boolean) => void;
  aoCarregarMais: () => void;
};

const ALTERNADOR = 'h-8 flex-1 rounded-sm text-[13px] font-semibold transition-colors';

export function ColunaLista(p: Props) {
  const { total, editais } = p.resultado;
  const lista = useRef<HTMLDivElement>(null);
  const primeiro = editais[0]?.id;
  // Resultado novo (não "carregar mais"): volta ao topo da lista.
  useEffect(() => {
    lista.current?.scrollTo({ top: 0 });
  }, [primeiro]);

  const valor = moedaCurta(p.painel.valorTotal);
  return (
    <>
      <div className="shrink-0">
        <p aria-live="polite" className="flex items-baseline gap-2">
          <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] lg:text-[34px]">
            {p.carregandoLista && editais.length === 0 ? '…' : numero(total)}
          </span>
          <span className="text-[15px] font-bold">{total === 1 ? 'edital aberto' : 'editais abertos'}</span>
        </p>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {p.painel.ufs} {p.painel.ufs === 1 ? 'UF' : 'UFs'} · {valor ?? 'R$ 0'} em valor estimado
        </p>
        <div className="mt-3 flex gap-1 rounded-md bg-sunken p-1" role="group" aria-label="Prazo">
          <button
            type="button"
            aria-pressed={!p.seteDias}
            onClick={() => p.aoMudarPrazo(false)}
            className={`${ALTERNADOR} ${!p.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
          >
            Todos abertos
          </button>
          <button
            type="button"
            aria-pressed={p.seteDias}
            onClick={() => p.aoMudarPrazo(true)}
            className={`${ALTERNADOR} ${p.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
          >
            Encerram em 7 dias
          </button>
        </div>
      </div>
      <div className={`mt-3 flex min-h-0 flex-1 flex-col ${p.recolhida ? 'max-lg:hidden' : ''}`}>
        {p.erro ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{p.erro}</p> : null}
        <div
          ref={lista}
          aria-busy={p.carregandoLista}
          className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 transition-opacity ${p.carregandoLista ? 'opacity-60' : ''}`}
        >
          {editais.length === 0 && !p.carregandoLista && !p.erro ? (
            <p className="px-2 py-6 text-ink-muted">Nenhum edital aberto para essa busca. Tente outro termo ou tire um filtro.</p>
          ) : null}
          {editais.map((e) => (
            <CardCompacto key={e.id} edital={e} agora={p.agora} selecionado={e.id === p.selecionadoId} aoSelecionar={() => p.aoSelecionar(e)} />
          ))}
          {editais.length < total ? (
            <button
              type="button"
              onClick={p.aoCarregarMais}
              disabled={p.carregandoMais || p.carregandoLista}
              className="h-11 shrink-0 rounded-sm border border-line-strong bg-raised text-sm font-semibold disabled:opacity-60"
            >
              {p.carregandoMais ? 'Carregando…' : 'Carregar mais'}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
