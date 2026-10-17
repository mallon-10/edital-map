import Link from 'next/link';
import { CONVITE_PLANOS, mensagemLimite, type TipoUso } from '@/lib/limites';

/** Cartão do limite do grátis: na lista (buscas) e na página do edital (editais). Basic e Pro levam à tabela em /planos. */
export function CartaoLimite({ tipo }: { tipo: TipoUso }) {
  return (
    <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <h2 className="text-[17px] font-bold leading-snug">{mensagemLimite(tipo)}</h2>
      <p className="text-[15px] text-ink-muted">{CONVITE_PLANOS}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/planos#basic"
          className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken"
        >
          Basic
        </Link>
        <Link href="/planos#pro" className="inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
          Pro
        </Link>
      </div>
    </section>
  );
}
