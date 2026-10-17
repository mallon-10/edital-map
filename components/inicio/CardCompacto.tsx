'use client';

import Link from 'next/link';
import type { KeyboardEvent, MouseEvent } from 'react';
import { etiqueta, moedaCurta } from '@/lib/formato';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from './estilos';
import { useComputador } from './useComputador';

type Props = { edital: EditalResumo; agora: Date; selecionado: boolean; aoSelecionar: () => void };

/**
 * Card da lista: título limpo, valor curto à direita, órgão · UF e etiqueta de prazo.
 * Computador (lg+): clicar seleciona (o resumo aparece na coluna da direita). Celular: tocar abre o edital.
 * Ctrl/⌘/Shift/Alt/botão do meio abrem em outra aba. Sem prefetch: cada edital aberto conta no limite do dia.
 * No computador, Espaço também seleciona (como o botão de antes) e o card escolhido é o `aria-current`.
 */
export function CardCompacto({ edital, agora, selecionado, aoSelecionar }: Props) {
  const et = etiqueta(edital, agora);
  const valor = moedaCurta(edital.valor_estimado);
  const { titulo, tipo } = assunto(edital.objeto);
  const computador = useComputador();

  function clicar(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia('(min-width: 1024px)').matches) {
      e.preventDefault();
      aoSelecionar();
    }
  }

  function tecla(e: KeyboardEvent<HTMLAnchorElement>) {
    if (e.key !== ' ' || !computador) return;
    e.preventDefault();
    aoSelecionar();
  }

  return (
    <Link
      href={`/edital/${edital.slug}`}
      prefetch={false}
      onClick={clicar}
      onKeyDown={tecla}
      // Seleção só existe no computador; no celular tocar abre o edital.
      aria-current={computador && selecionado ? 'true' : undefined}
      className={`flex w-full shrink-0 flex-col gap-2 rounded-md border bg-raised p-3.5 text-left transition-colors ${
        selecionado ? 'border-line lg:border-ink lg:shadow-[0_0_0_1px_#0c2340]' : 'border-line hover:border-line-strong'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-3 text-[14px] font-semibold leading-5">{titulo}</span>
        {valor ? (
          <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-medium">{valor}</span>
        ) : (
          <span className="w-16 shrink-0 text-right text-[11px] leading-4 text-ink-muted">Valor não informado</span>
        )}
      </span>
      <span className="truncate text-xs text-ink-muted">
        {[tipo, nomeProprio(edital.orgao_nome), edital.uf].filter(Boolean).join(' · ')}
      </span>
      {edital.onde === 'itens' ? <span className="text-xs text-rio">Encontrado nos itens</span> : null}
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
        <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
        {et.texto}
      </span>
    </Link>
  );
}
