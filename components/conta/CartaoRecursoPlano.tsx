import Link from 'next/link';

/** Convite ao Pro para um recurso da conta (salvos, alertas, resumo semanal): leva à página Planos. */
export function CartaoRecursoPlano({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section role="status" className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5 text-ink">
      <h2 className="text-[17px] font-bold leading-snug">{titulo}</h2>
      <p className="text-[15px] text-ink-muted">{texto}</p>
      <Link href="/planos" prefetch={false} className="inline-flex h-11 w-fit items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
        Conhecer o Pro
      </Link>
    </section>
  );
}
