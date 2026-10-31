'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { haQuanto, numero } from '@/lib/formato';
import { BotaoExportar, REDONDO } from './BotaoExportar';
import { IconeMapa, IconeSino } from './Icones';

type Props = {
  /** O que se busca e onde (tituloDaBusca, lib/inicio.ts). */
  titulo: string;
  total: number;
  carregando: boolean;
  /** "R$ 125,10 mi em valor estimado · 1 UF", ou o aviso enquanto o resumo do mapa não chegou. */
  resumo: string;
  atualizadoEm: string | null;
  agora: Date;
  /** Parâmetros da busca atual (os de /api/busca), para o Exportar. */
  parametrosBusca: string;
  aoErroExportar: (mensagem: string | null) => void;
  aoVerEditais: () => void;
  /** Vista Lista (sem o mapa): o botão que liga o mapa de novo. */
  aoMostrarMapa: () => void;
  /** Criar alerta com os filtros da busca atual (hrefAlertaDaBusca). */
  hrefAlerta: string;
  /** O mapa (vista Mapa): em cima no celular, à direita a partir de lg. Sem ele, o cartão é só o resumo. */
  children?: ReactNode;
};

/** Pino da marca dentro do círculo do cartão do topo. */
function PinoGrande() {
  return (
    <svg viewBox="0 0 22 28" className="h-[38px] w-[30px]" aria-hidden="true">
      <path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f" />
      <path d="M15 0v6h6" fill="#b33a0e" />
      <circle cx="11" cy="11" r="3.5" fill="#ffe3d6" />
    </svg>
  );
}

/**
 * Cartão do topo da página inicial (spec 2026-10-21-visual-novo-inicio-design.md): o que se busca, quantos editais e o valor,
 * "Ver os N editais", criar alerta e exportar; e o mapa. A contagem é anunciada (aria-live) a cada busca.
 */
export function CartaoTopo(p: Props) {
  const comMapa = Boolean(p.children);
  const contagem = p.carregando && p.total === 0 ? 'Buscando…' : `${numero(p.total)} ${p.total === 1 ? 'edital aberto' : 'editais abertos'}`;
  return (
    <section
      aria-labelledby="titulo-busca"
      className={`flex flex-col overflow-hidden rounded-[26px] bg-raised lg:flex-row lg:rounded-[28px] ${comMapa ? 'lg:min-h-[460px]' : ''}`}
    >
      {p.children}
      <div className="flex min-w-0 flex-col justify-between gap-5 px-5 pb-6 pt-5 lg:flex-[1_1_44%] lg:gap-8 lg:p-10">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted lg:text-xs">
          Fonte PNCP{p.atualizadoEm ? ` · atualizado ${haQuanto(p.atualizadoEm, p.agora)}` : ''}
        </p>
        <div className="flex items-center gap-5">
          <span
            aria-hidden="true"
            className="hidden size-[76px] shrink-0 items-center justify-center rounded-full bg-pin-soft shadow-[inset_0_0_0_3px_#ffffff,0_0_0_2px_#ffe3d6] lg:flex"
          >
            <PinoGrande />
          </span>
          <div className="min-w-0">
            <h1 id="titulo-busca" className="text-[26px] font-bold leading-[30px] tracking-[-0.015em] lg:text-[38px] lg:leading-[42px] lg:tracking-[-0.02em]">
              {p.titulo}
            </h1>
            <p aria-live="polite" className="mt-1.5 text-[18px] font-semibold text-mata lg:text-[22px]">
              {contagem}
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink-muted min-[400px]:text-[13px] lg:text-sm">{p.resumo}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
          <button
            type="button"
            onClick={p.aoVerEditais}
            className="h-[54px] min-w-0 flex-1 rounded-full bg-pin px-6 text-[17px] font-semibold text-on-pin lg:h-[60px] lg:flex-none lg:px-9 lg:text-[18px]"
          >
            <span className="lg:hidden">Ver os editais</span>
            <span className="hidden lg:inline">{p.total > 0 ? `Ver os ${numero(p.total)} editais` : 'Ver a lista'}</span>
          </button>
          <Link href={p.hrefAlerta} prefetch={false} aria-label="Criar alerta por e-mail" title="Criar alerta por e-mail" className={REDONDO}>
            <IconeSino className="size-[22px]" />
          </Link>
          <BotaoExportar parametros={p.parametrosBusca} total={p.total} aoErro={p.aoErroExportar} redondo />
          {comMapa ? null : (
            <button type="button" onClick={p.aoMostrarMapa} aria-label="Mostrar o mapa" title="Mostrar o mapa" className={REDONDO}>
              <IconeMapa className="size-[22px]" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
