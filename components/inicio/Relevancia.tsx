'use client';

import { useId, useState } from 'react';
import { AVISO_RELEVANCIA, type NivelRelevancia, type Relevancia } from '@/lib/relevancia/pontuacao';

const ESTILO_NIVEL: Record<NivelRelevancia, string> = {
  Alta: 'bg-mata-soft text-mata',
  Média: 'bg-ouro-soft text-ouro-strong',
  Baixa: 'bg-sunken text-ink-muted',
};
const rotulo = (r: Relevancia) => `Relevância ${r.nivel.toLocaleLowerCase('pt-BR')}`;

/** Só o nível (card compacto e resumo escuro); tocar ou usar o teclado abre o aviso (title só funciona com o mouse). */
export function PilulaRelevancia({ relevancia }: { relevancia: Relevancia }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        title={AVISO_RELEVANCIA}
        onClick={() => setAberto((v) => !v)}
        className={`relative inline-flex w-fit items-center rounded-xs px-2 py-0.5 text-xs font-semibold after:absolute after:-inset-3 ${ESTILO_NIVEL[relevancia.nivel]}`}
      >
        {rotulo(relevancia)}
      </button>
      {aberto ? (
        <span id={id} className="text-xs text-ink-muted">
          {AVISO_RELEVANCIA}
        </span>
      ) : null}
    </span>
  );
}

/** Nível e pontuação, o "?" que abre o aviso (tocar também abre: no celular não há tooltip) e a explicação. */
export function IndicadorRelevancia({ relevancia }: { relevancia: Relevancia }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_NIVEL[relevancia.nivel]}`}>
          {rotulo(relevancia)} · <span className="font-mono">{relevancia.pontos}</span>
        </span>
        {/* 20 px visíveis, 44 px de toque (a área invisível passa 12 px de cada lado). */}
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={id}
          aria-label="O que é a relevância"
          title={AVISO_RELEVANCIA}
          onClick={() => setAberto((v) => !v)}
          className="relative inline-flex size-5 items-center justify-center rounded-full border border-line-strong text-[11px] font-bold text-ink-muted after:absolute after:-inset-3"
        >
          ?
        </button>
      </div>
      {aberto ? (
        <p id={id} className="text-xs text-ink-muted">
          {AVISO_RELEVANCIA}
        </p>
      ) : null}
      {relevancia.explicacao ? <p className="text-[13px]">{relevancia.explicacao}</p> : null}
    </div>
  );
}
