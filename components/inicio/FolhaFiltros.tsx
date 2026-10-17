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
  atualizadoEm: string | null;
  agora: Date;
  aoAplicar: (f: FiltrosTela) => void;
  aoFechar: () => void;
};

const ALTERNADOR = 'h-10 flex-1 rounded-sm text-sm font-semibold transition-colors';

/**
 * Celular: folha em tela cheia com os mesmos controles do computador (UF, Município, Valor, Modalidade, Órgão, Raio) e o prazo.
 * As escolhas ficam num rascunho e só valem no "Ver N editais" (uma busca só, no limite do dia). N vem de /api/contagem,
 * que não conta como busca.
 */
export function FolhaFiltros({ aberta, filtros, pontos, atualizadoEm, agora, aoAplicar, aoFechar }: Props) {
  const [rascunho, setRascunho] = useState<FiltrosTela>(filtros);
  const [total, setTotal] = useState<number | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const parametros = paraParametros(rascunho).toString();

  // Aberta, a página de baixo não rola; ao fechar, o foco volta para quem abriu (o botão "Filtros").
  // Vem antes do efeito que leva o foco ao título, para guardar o foco de antes de abrir.
  useEffect(() => {
    if (!aberta) return;
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raiz = document.documentElement;
    const overflow = raiz.style.overflow;
    raiz.style.overflow = 'hidden';
    return () => {
      raiz.style.overflow = overflow;
      antes?.focus({ preventScroll: true });
    };
  }, [aberta]);

  // Ao abrir, começa dos filtros que valem agora e leva o foco para o título.
  useEffect(() => {
    if (!aberta) return;
    setRascunho(filtros);
    titulo.current?.focus();
  }, [aberta, filtros]);

  // Quantos editais o rascunho traria (espera o toque parar por 300 ms).
  useEffect(() => {
    if (!aberta) return;
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
  }, [aberta, parametros]);

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aberta, aoFechar]);

  if (!aberta) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="folha-filtros-titulo" className="fixed inset-0 z-50 flex flex-col bg-surface lg:hidden">
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
        <Chips filtros={rascunho} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={(f) => setRascunho(normalizarTela(f))} emFolha />
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
