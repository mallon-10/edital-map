import { haQuanto } from '@/lib/formato';

export function FaixaCobertura({ atualizadoEm }: { atualizadoEm: string | null }) {
  return (
    <p className="border-b border-line bg-sunken px-4 py-2 text-[13px] text-ink-muted md:px-6">
      Hoje cobrimos <strong className="text-ink">SC, PR e RS</strong> · fonte: PNCP
      {atualizadoEm ? <> · atualizado {haQuanto(atualizadoEm, new Date())}</> : null}
    </p>
  );
}
