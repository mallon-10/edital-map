'use client';

import Link from 'next/link';
import { useId, useRef, type ReactNode } from 'react';
import { registrar } from '@/lib/cliente/registrar';

type Props = { recurso: 'plano_pro' | 'filtros_pro'; className?: string; rotulo?: string; children: ReactNode };

/** Botão de recurso da Fase 3: registra o interesse e abre um aviso "em breve" com atalho para criar alerta. */
export function BotaoEmBreve({ recurso, className, rotulo, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  return (
    <>
      <button
        type="button"
        aria-label={rotulo}
        className={className}
        onClick={() => {
          registrar('quer_recurso', { recurso });
          dialogo.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={titulo}
        className="m-auto w-[min(92vw,420px)] rounded-lg border border-line bg-raised p-6 text-ink shadow-[0_8px_32px_rgba(12,35,64,.18)] backdrop:bg-ink/40"
      >
        <h2 id={titulo} className="text-lg font-bold">Em breve</h2>
        <p className="mt-2 text-[15px] text-ink-muted">
          Os planos chegam em breve. Enquanto isso, crie um alerta grátis para ser avisado.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/alertas" className="inline-flex h-10 items-center rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin">
            Criar alerta
          </Link>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            className="h-10 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
          >
            Fechar
          </button>
        </div>
      </dialog>
    </>
  );
}
