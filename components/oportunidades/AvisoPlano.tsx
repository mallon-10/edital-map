'use client';

import Link from 'next/link';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';

const BOTAO_SECUNDARIO = 'inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-3 text-[13px] font-semibold hover:bg-sunken';

/**
 * Balão junto ao botão: convite ao Pro (grátis: "Assinar o Pro" e "Comparar planos") ou só a
 * mensagem (limite do Pro, plano não confirmado, falha). Fica por cima do card (z-30). A mensagem é texto (React).
 */
export function AvisoPlano({ mensagem, planos, aoFechar }: { mensagem: string; planos: boolean; aoFechar: () => void }) {
  return (
    <span
      role="status"
      onKeyDown={(e) => (e.key === 'Escape' ? aoFechar() : undefined)}
      className="absolute right-0 top-full z-30 mt-2 flex w-72 max-w-[calc(100vw-32px)] flex-col gap-2 rounded-md border border-pin bg-pin-soft p-3 text-left text-[13px] font-normal text-ink"
    >
      <span className="font-semibold">{mensagem}</span>
      {planos ? <span className="text-ink-muted">{MENSAGENS_LIMITE_CONTA.salvosConvite}</span> : null}
      <span className="flex flex-wrap items-center gap-2">
        {planos ? (
          <>
            <Link href="/assinar" prefetch={false} className="inline-flex h-11 items-center rounded-sm bg-pin px-3 text-[13px] font-semibold text-on-pin">
              Assinar o Pro
            </Link>
            <Link href="/planos" prefetch={false} className={BOTAO_SECUNDARIO}>
              Comparar planos
            </Link>
          </>
        ) : null}
        <button type="button" onClick={aoFechar} className="inline-flex h-11 items-center rounded-sm px-3 text-[13px] font-semibold hover:bg-raised">
          Fechar
        </button>
      </span>
    </span>
  );
}
