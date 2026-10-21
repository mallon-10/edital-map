'use client';

import { useRef, type KeyboardEvent } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import { economiaAnual } from '@/lib/paginaPlanos';
import { PERIODOS, PLANOS, type Periodo } from '@/lib/planos';
import { usePeriodo } from './Periodo';

const ROTULO: Record<Periodo, string> = { mensal: 'Mensal', anual: 'Anual' };
const ECONOMIA = economiaAnual(PLANOS.find((p) => p.id === 'pro')!);

/**
 * Alternador Mensal | Anual (radiogroup): um só ponto de tabulação, setas trocam e levam o foco. Alvos de 44 px.
 * Cada troca vai para a medição (escolheu_periodo).
 */
export function AlternadorPeriodo() {
  const { periodo, escolher } = usePeriodo();
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);

  function trocar(p: Periodo) {
    if (p === periodo) return;
    escolher(p);
    registrar('usou_recurso', { recurso: 'escolheu_periodo', periodo: p });
  }

  function teclas(e: KeyboardEvent, i: number) {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const j = (i + passo + PERIODOS.length) % PERIODOS.length;
    trocar(PERIODOS[j]);
    botoes.current[j]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Período de cobrança" className="inline-flex gap-1 rounded-full bg-raised p-1">
      {PERIODOS.map((p, i) => {
        const ativo = p === periodo;
        return (
          <button
            key={p}
            ref={(el) => {
              botoes.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => trocar(p)}
            onKeyDown={(e) => teclas(e, i)}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors ${
              ativo ? 'bg-ink text-surface' : 'text-ink hover:bg-sunken'
            }`}
          >
            {ROTULO[p]}
            {p === 'anual' ? (
              <span className="rounded-full bg-mata-soft px-2 py-0.5 font-mono text-[11.5px] font-bold text-mata">−{ECONOMIA}%</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
