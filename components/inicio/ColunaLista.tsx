'use client';

import { useEffect, useState, type RefObject } from 'react';
import { CartaoLimite, CartaoPro } from '@/components/CartaoLimite';
import { FONTE_COBERTURA } from '@/lib/cobertura';
import { moedaCurta, numero } from '@/lib/formato';
import { planoDoLimite, type Limite } from '@/lib/limites';
import type { Painel } from '@/lib/painel';
import type { Cidade, EditalResumo, FiltrosTela, Ordem, ResultadoBusca } from '@/lib/tipos';
import type { Vista } from '@/lib/urlBusca';
import { BotaoExportar } from './BotaoExportar';
import { CardCompacto } from './CardCompacto';
import { CardLista } from './CardLista';
import { EstadoVazio } from './EstadoVazio';
import { Paginacao } from './Paginacao';
import { SeletorOrdem } from './SeletorOrdem';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  painel: Painel;
  /** Falso enquanto os pontos do mapa não chegaram: o resumo (UFs, valor) ainda não é verdadeiro. */
  painelPronto?: boolean;
  /** Lista: cards largos (vista Lista). Mapa: cards compactos na coluna da esquerda (vista Mapa). */
  vista?: Vista;
  /** Filtros aplicados (cidade e prazo aparecem aqui; o estado vazio propõe outras buscas a partir deles). */
  filtros: FiltrosTela;
  selecionadoId: string | null;
  carregandoLista: boolean;
  erro: string | null;
  /** Busca nova além das 3 do dia: no lugar da lista, o cartão dos planos. */
  limite: Limite | null;
  /** A busca usa raio ou órgão sem o plano Pro (402 recurso_pro): o cartão do Pro no lugar da lista. */
  proBloqueado: boolean;
  aoTirarFiltrosPro: () => void;
  pagina: number;
  /** Ordem que vale agora (ordemEfetiva). */
  ordem: Ordem;
  temTermo: boolean;
  /** Parâmetros da busca atual (os mesmos de /api/busca, com a ordem), para o botão Exportar. */
  parametrosBusca: string;
  /** Área que rola a partir de lg (a página guarda a posição para voltar do edital no mesmo lugar). No celular rola a página. */
  listaRef: RefObject<HTMLDivElement | null>;
  aoRolar: (topo: number) => void;
  aoTirarCidade: () => void;
  aoSelecionar: (e: EditalResumo) => void;
  aoMudarPrazo: (seteDias: boolean) => void;
  aoMudarOrdem: (o: Ordem) => void;
  aoIrPagina: (pagina: number) => void;
  /** Sugestão do estado vazio: outra busca (conta como busca nova). */
  aoAplicar: (f: FiltrosTela) => void;
};

const ALTERNADOR = 'h-8 flex-1 rounded-sm text-[13px] font-semibold transition-colors';

/** Celular: o município escolhido (com o raio), com o × para tirar; no computador ele aparece nos chips. */
function PilulaCidade({ cidade, raio, aoTirar }: { cidade: Cidade; raio: number | null; aoTirar: () => void }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-sm bg-ink pl-2 text-xs font-semibold text-surface lg:hidden">
      <span className="truncate">
        {cidade.nome}/{cidade.uf}
        {raio ? ` + ${raio} km` : ''}
      </span>
      {/* 24 px visíveis, 44 px de toque (a área invisível passa 10 px de cada lado). */}
      <button
        type="button"
        onClick={aoTirar}
        aria-label="Tirar filtro de cidade"
        className="relative size-6 shrink-0 text-base leading-none after:absolute after:-inset-2.5"
      >
        ×
      </button>
    </span>
  );
}

/**
 * Contagem, resumo, prazo, ordem, Exportar, os cards e a paginação. A partir de lg rola por dentro;
 * no celular fica no fluxo da página (quem rola é a página).
 */
export function ColunaLista(p: Props) {
  const { total, editais } = p.resultado;
  const vista = p.vista ?? 'mapa';
  const { cidade, raio, seteDias } = p.filtros;
  const painelPronto = p.painelPronto ?? true;
  const [erroExportar, setErroExportar] = useState<string | null>(null);
  // Toda busca nova e toda troca de página ou de ordem volta ao topo da lista.
  // O erro da exportação é da busca em que ocorreu: some quando a busca muda.
  useEffect(() => setErroExportar(null), [p.parametrosBusca]);
  useEffect(() => {
    if (p.carregandoLista) p.listaRef.current?.scrollTo({ top: 0 });
  }, [p.carregandoLista, p.listaRef]);

  if (p.proBloqueado) {
    return (
      <div className="flex flex-col p-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <CartaoPro aoTirarFiltros={p.aoTirarFiltrosPro} />
      </div>
    );
  }

  if (p.limite) {
    return (
      <div className="flex flex-col p-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {/* Celular: o município fica à mão acima do cartão (tirar o filtro pode voltar a uma busca já feita hoje). */}
        {cidade ? (
          <div className="mb-3 flex lg:hidden">
            <PilulaCidade cidade={cidade} raio={raio} aoTirar={p.aoTirarCidade} />
          </div>
        ) : null}
        <CartaoLimite tipo={p.limite.tipo} plano={planoDoLimite(p.limite)} />
      </div>
    );
  }

  const valor = moedaCurta(p.painel.valorTotal);
  const vazia = editais.length === 0 && !p.carregandoLista && !p.erro;
  return (
    <>
      <div className="shrink-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <p aria-live="polite" className="flex shrink-0 items-baseline gap-2">
            <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] lg:text-[34px]">
              {p.carregandoLista && editais.length === 0 ? '…' : numero(total)}
            </span>
            <span className="text-[15px] font-bold">{total === 1 ? 'edital aberto' : 'editais abertos'}</span>
          </p>
          {cidade ? <PilulaCidade cidade={cidade} raio={raio} aoTirar={p.aoTirarCidade} /> : null}
          <span className="ml-auto">
            <BotaoExportar parametros={p.parametrosBusca} total={total} aoErro={setErroExportar} />
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {painelPronto
            ? `${p.painel.ufs} ${p.painel.ufs === 1 ? 'UF' : 'UFs'} · ${valor ? `${valor} em valor estimado` : 'valor não informado'}`
            : 'Carregando o resumo…'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[240px] flex-1 gap-1 rounded-md bg-sunken p-1" role="group" aria-label="Prazo">
            <button
              type="button"
              aria-pressed={!seteDias}
              onClick={() => p.aoMudarPrazo(false)}
              className={`${ALTERNADOR} ${!seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Todos abertos
            </button>
            <button
              type="button"
              aria-pressed={seteDias}
              onClick={() => p.aoMudarPrazo(true)}
              className={`${ALTERNADOR} ${seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Encerram em 7 dias
            </button>
          </div>
          <SeletorOrdem ordem={p.ordem} temTermo={p.temTermo} aoMudar={p.aoMudarOrdem} />
        </div>
      </div>
      <div className="mt-3 flex flex-col lg:min-h-0 lg:flex-1">
        {vista === 'mapa' ? (
          <p className="mb-3 shrink-0 font-mono text-[11px] text-ink-muted lg:hidden">
            O ponto é a sede do órgão, não o local de entrega
          </p>
        ) : null}
        {p.erro ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{p.erro}</p> : null}
        {erroExportar ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{erroExportar}</p> : null}
        <div
          ref={p.listaRef}
          onScroll={(e) => p.aoRolar(e.currentTarget.scrollTop)}
          aria-busy={p.carregandoLista}
          className={`flex flex-col ${vista === 'lista' ? 'gap-3' : 'gap-2.5'} p-1 transition-opacity lg:min-h-0 lg:flex-1 lg:overflow-y-auto ${p.carregandoLista ? 'opacity-60' : ''}`}
        >
          {vazia && total > 0 ? (
            <div className="flex flex-col items-start gap-2 px-2 py-6">
              <p className="text-ink-muted">Esta página não tem editais.</p>
              <button type="button" onClick={() => p.aoIrPagina(1)} className="h-11 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold">
                Ir para a página 1
              </button>
            </div>
          ) : null}
          {vazia && total === 0 ? <EstadoVazio filtros={p.filtros} aoAplicar={p.aoAplicar} /> : null}
          {editais.map((e) =>
            vista === 'lista' ? (
              <CardLista key={e.id} edital={e} agora={p.agora} />
            ) : (
              <CardCompacto key={e.id} edital={e} agora={p.agora} selecionado={e.id === p.selecionadoId} aoSelecionar={() => p.aoSelecionar(e)} />
            ),
          )}
          <Paginacao pagina={p.pagina} total={total} carregando={p.carregandoLista} aoIr={p.aoIrPagina} />
          <p className="shrink-0 px-1 pb-2 pt-1 text-center font-mono text-[11px] text-ink-muted">{FONTE_COBERTURA}</p>
        </div>
      </div>
    </>
  );
}
