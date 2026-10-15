import { haQuanto } from '@/lib/formato';

export function FaixaCobertura({ atualizadoEm }: { atualizadoEm: string | null }) {
  return (
    <p className="shrink-0 truncate border-b border-line bg-sunken px-4 py-2 text-xs text-ink-muted md:px-6 md:text-[13px] md:leading-normal">
      Hoje cobrimos <strong className="text-ink">SC, PR e RS</strong> · <span className="hidden sm:inline">fonte: </span>PNCP
      {atualizadoEm ? <> · atualizado {haQuanto(atualizadoEm, new Date())}</> : null}
    </p>
  );
}
