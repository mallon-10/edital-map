import { FONTE_COBERTURA } from '@/lib/cobertura';
import { haQuanto } from '@/lib/formato';

/** Sem truncar: no celular a linha quebra em duas, e "atualizado há X" nunca é cortado. */
export function FaixaCobertura({ atualizadoEm }: { atualizadoEm: string | null }) {
  return (
    <p className="flex shrink-0 flex-wrap gap-x-1 border-b border-line bg-sunken px-4 py-2 text-xs text-ink-muted md:px-6 md:text-[13px] md:leading-normal">
      <span>{FONTE_COBERTURA}</span>
      {atualizadoEm ? <span className="whitespace-nowrap">· atualizado {haQuanto(atualizadoEm, new Date())}</span> : null}
    </p>
  );
}
