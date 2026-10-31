import Link from 'next/link';
import { hrefAssessoria, PRECO_ASSESSORIA } from '@/lib/assessoria';

/** Para quem chega aos planos sem saber como participar: a assessoria é outro serviço, não um plano mais caro. */
export function AssessoriaPlanos() {
  return (
    <section aria-labelledby="assessoria-planos" className="mx-auto flex w-full max-w-[900px] flex-col gap-3 rounded-[22px] bg-mata-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:p-6">
      <div className="min-w-0">
        <h2 id="assessoria-planos" className="text-balance text-[20px] font-bold leading-tight">
          Encontrou uma licitação e não sabe como participar?
        </h2>
        <p className="mt-1 text-pretty text-[15px] text-ink-muted">
          O Pro acompanha editais; quem orienta a participar é a Assessoria Edital Map, um serviço à parte, a partir de {PRECO_ASSESSORIA}.
        </p>
      </div>
      <Link
        href={hrefAssessoria()}
        prefetch={false}
        className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-mata px-5 py-2.5 text-[15px] font-semibold text-raised hover:brightness-110"
      >
        Conhecer a assessoria
      </Link>
    </section>
  );
}
