import Link from 'next/link';
import { textoPrevia } from '@/lib/radar';

/** Grátis: depois dos 5 primeiros, o convite aos planos (o resto do radar fica para Basic e Pro). */
export function CartaoPreviaRadar({ total }: { total: number }) {
  return (
    <section aria-labelledby="previa-radar" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-pin-strong">Prévia do Radar</p>
      <h2 id="previa-radar" className="text-[17px] font-bold leading-snug">{textoPrevia(total)}</h2>
      <p className="text-[15px] text-ink-muted">Nos planos Basic e Pro o radar mostra todas, em páginas de 20.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/planos#basic" className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken">
          Basic
        </Link>
        <Link href="/planos#pro" className="inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
          Pro
        </Link>
      </div>
    </section>
  );
}
