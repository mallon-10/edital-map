'use client';

import { useEffect, useState, type RefObject } from 'react';
import { moedaCurta, numero } from '@/lib/formato';
import type { Painel } from '@/lib/painel';
import type { Cidade, EditalResumo, ResultadoBusca } from '@/lib/tipos';
import { CartaoLimite } from '@/components/CartaoLimite';
import type { Limite } from '@/lib/limites';
import { BotaoExportar } from './BotaoExportar';
import { CardCompacto } from './CardCompacto';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  painel: Painel;
  /** Falso enquanto os pontos do mapa não chegaram: o resumo (UFs, valor) ainda não é verdadeiro. */
  painelPronto?: boolean;
  seteDias: boolean;
  selecionadoId: string | null;
  carregandoLista: boolean;
  carregandoMais: boolean;
  erro: string | null;
  /** Busca nova além das 3 do dia: no lugar da lista, o cartão dos planos. */
  limite: Limite | null;
  /** No celular, com a gaveta recolhida só a contagem e o alternador aparecem. */
  recolhida: boolean;
  /** Município escolhido no mapa: no celular a linha de chips fica atrás da gaveta, então o filtro aparece e sai daqui. */
  cidade: Cidade | null;
  /** Raio em km a partir da cidade (aparece na pílula do celular). */
  raio: number | null;
  /** Parâmetros da busca atual (os mesmos de /api/busca), para o botão Exportar. */
  parametrosBusca: string;
  /** Área que rola (a página guarda a posição para voltar do edital no mesmo lugar). */
  listaRef: RefObject<HTMLDivElement | null>;
  aoRolar: (topo: number) => void;
  aoTirarCidade: () => void;
  aoSelecionar: (e: EditalResumo) => void;
  aoMudarPrazo: (seteDias: boolean) => void;
  aoCarregarMais: () => void;
};

const ALTERNADOR = 'h-8 flex-1 rounded-sm text-[13px] font-semibold transition-colors';

export function ColunaLista(p: Props) {
  const { total, editais } = p.resultado;
  const painelPronto = p.painelPronto ?? true;
  const [erroExportar, setErroExportar] = useState<string | null>(null);
  // Toda busca nova (inclusive a que traz o mesmo primeiro edital) volta ao topo; "carregar mais" não mexe em `carregandoLista`.
  // O erro da exportação é da busca em que ocorreu: some quando a busca muda.
  useEffect(() => setErroExportar(null), [p.parametrosBusca]);
  useEffect(() => {
    if (p.carregandoLista) p.listaRef.current?.scrollTo({ top: 0 });
  }, [p.carregandoLista, p.listaRef]);

  if (p.limite) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1">
        <CartaoLimite tipo={p.limite.tipo} />
      </div>
    );
  }

  const valor = moedaCurta(p.painel.valorTotal);
  return (
    <>
      <div className="shrink-0">
        {/* A pílula fica na mesma linha da contagem para não aumentar a gaveta recolhida (ALTURA_GAVETA_RECOLHIDA). */}
        <div className="flex items-center gap-2">
          <p aria-live="polite" className="flex shrink-0 items-baseline gap-2">
            <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] lg:text-[34px]">
              {p.carregandoLista && editais.length === 0 ? '…' : numero(total)}
            </span>
            <span className="text-[15px] font-bold">{total === 1 ? 'edital aberto' : 'editais abertos'}</span>
          </p>
          {p.cidade ? (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-sm bg-ink pl-2 text-xs font-semibold text-surface lg:hidden">
              <span className="truncate">
                {p.cidade.nome}/{p.cidade.uf}
                {p.raio ? ` + ${p.raio} km` : ''}
              </span>
              <button type="button" onClick={p.aoTirarCidade} aria-label="Tirar filtro de cidade" className="size-6 shrink-0 text-base leading-none">
                ×
              </button>
            </span>
          ) : null}
          {/* Some com a gaveta recolhida (altura fixa); o erro aparece na área rolável abaixo. */}
          <span className={`ml-auto ${p.recolhida ? 'max-lg:hidden' : ''}`}>
            <BotaoExportar parametros={p.parametrosBusca} total={total} aoErro={setErroExportar} />
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {painelPronto
            ? `${p.painel.ufs} ${p.painel.ufs === 1 ? 'UF' : 'UFs'} · ${valor ? `${valor} em valor estimado` : 'valor não informado'}`
            : 'Carregando o resumo…'}
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
        <p className="mb-3 shrink-0 font-mono text-[11px] text-ink-muted lg:hidden">
          Editais abertos de todo o Brasil · o ponto é a sede do órgão, não o local de entrega
        </p>
        {p.erro ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{p.erro}</p> : null}
        {erroExportar ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{erroExportar}</p> : null}
        <div
          ref={p.listaRef}
          onScroll={(e) => p.aoRolar(e.currentTarget.scrollTop)}
          aria-busy={p.carregandoLista}
          className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-1 transition-opacity ${p.carregandoLista ? 'opacity-60' : ''}`}
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
