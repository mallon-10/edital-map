'use client';

import { useEffect, useRef, useState } from 'react';
import { filtrosAtivos, limparFiltros, normalizarTela, paraParametros } from '@/lib/filtros';
import { numero } from '@/lib/formato';
import type { FiltrosTela, PontoMapa } from '@/lib/tipos';
import { Chips } from './Chips';

type Props = {
  aberta: boolean;
  filtros: FiltrosTela;
  pontos: PontoMapa[];
  aoAplicar: (f: FiltrosTela) => void;
  aoFechar: () => void;
};

const ALTERNADOR = 'h-10 flex-1 rounded-sm text-sm font-semibold transition-colors';

/**
 * Celular: folha em tela cheia com os mesmos controles do computador (UF, Município, Valor, Modalidade, Órgão, Raio) e o prazo.
 * As escolhas ficam num rascunho e só valem no "Ver N editais" (uma busca só). N vem de /api/contagem,
 * que não grava o evento de busca. Fechada, a folha não existe: cada abertura começa um rascunho novo dos filtros que valem.
 */
export function FolhaFiltros({ aberta, ...resto }: Props) {
  return aberta ? <ConteudoFolha {...resto} /> : null;
}

function ConteudoFolha({ filtros, pontos, aoAplicar, aoFechar }: Omit<Props, 'aberta'>) {
  const [rascunho, setRascunho] = useState<FiltrosTela>(filtros);
  const [total, setTotal] = useState<number | null>(null);
  const folha = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const parametros = paraParametros(rascunho).toString();

  // Aberta, a página de baixo não rola; ao fechar, o foco volta para quem abriu (o botão "Filtros").
  // Vem antes do efeito que leva o foco ao título, para guardar o foco de antes de abrir.
  useEffect(() => {
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raiz = document.documentElement;
    const overflow = raiz.style.overflow;
    raiz.style.overflow = 'hidden';
    return () => {
      raiz.style.overflow = overflow;
      antes?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    titulo.current?.focus();
  }, []);

  // A folha é só do celular: se a tela passa a ter a largura do computador, ela fecha (e a página volta a rolar).
  useEffect(() => {
    const computador = window.matchMedia('(min-width: 1024px)');
    if (computador.matches) {
      aoFechar();
      return;
    }
    const mudou = (e: MediaQueryListEvent) => {
      if (e.matches) aoFechar();
    };
    computador.addEventListener('change', mudou);
    return () => computador.removeEventListener('change', mudou);
  }, [aoFechar]);

  // Quantos editais o rascunho traria (espera o toque parar por 300 ms).
  useEffect(() => {
    setTotal(null);
    const controle = new AbortController();
    const espera = setTimeout(() => {
      fetch(`/api/contagem?${parametros}`, { signal: controle.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ total?: unknown }>) : null))
        .then((c) => setTotal(typeof c?.total === 'number' ? c.total : null))
        .catch(() => undefined);
    }, 300);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [parametros]);

  // Esc fecha a folha, a menos que seja para um painel aberto dentro dela (Município, Modalidade, Órgão): esse fecha sozinho.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (folha.current?.querySelector('[role="dialog"]')) return;
      aoFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  return (
    <div ref={folha} role="dialog" aria-modal="true" aria-labelledby="folha-filtros-titulo" className="fixed inset-0 z-50 flex flex-col bg-surface lg:hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-raised px-2 py-1.5">
        <button type="button" onClick={aoFechar} aria-label="Fechar filtros" className="size-11 rounded-sm text-2xl leading-none">
          ×
        </button>
        <h2 id="folha-filtros-titulo" ref={titulo} tabIndex={-1} className="text-lg font-bold outline-none">
          Filtros
        </h2>
        <button
          type="button"
          onClick={() => setRascunho(limparFiltros(rascunho))}
          disabled={filtrosAtivos(rascunho) === 0}
          className="ml-auto h-11 px-3 text-sm font-semibold text-pin-strong disabled:opacity-50"
        >
          Limpar filtros
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4">
        <Chips filtros={rascunho} pontos={pontos} aoMudar={(f) => setRascunho(normalizarTela(f))} emFolha />
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-ink-muted">Prazo</p>
          <div className="flex gap-1 rounded-md bg-sunken p-1" role="group" aria-label="Prazo">
            <button
              type="button"
              aria-pressed={!rascunho.seteDias}
              onClick={() => setRascunho({ ...rascunho, seteDias: false })}
              className={`${ALTERNADOR} ${!rascunho.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Todos abertos
            </button>
            <button
              type="button"
              aria-pressed={rascunho.seteDias}
              onClick={() => setRascunho({ ...rascunho, seteDias: true })}
              className={`${ALTERNADOR} ${rascunho.seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Encerram em 7 dias
            </button>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-line bg-raised px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => {
            aoAplicar(rascunho);
            aoFechar();
          }}
          className="h-12 w-full rounded-md bg-pin text-[15px] font-bold text-on-pin"
        >
          {total === null ? 'Ver editais' : `Ver ${numero(total)} ${total === 1 ? 'edital' : 'editais'}`}
        </button>
      </div>
    </div>
  );
}
