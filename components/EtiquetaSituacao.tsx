import { rotuloSituacao } from '@/lib/situacao';

/** "Suspensa" (e, por link direto, "Revogada"/"Anulada") nos cards e no edital; nada para as outras situações. */
export function EtiquetaSituacao({ situacaoId }: { situacaoId: number | null }) {
  const rotulo = rotuloSituacao(situacaoId);
  if (!rotulo) return null;
  return <span className="inline-flex h-[26px] w-fit items-center rounded-full bg-pin-soft px-2.5 text-xs font-semibold text-pin-strong">{rotulo}</span>;
}
