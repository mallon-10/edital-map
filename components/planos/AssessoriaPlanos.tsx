import Link from 'next/link';
import { HREF_CURSO } from '@/components/CartaoCurso';

/** Para quem chega aos planos sem saber como participar: o curso ensina, o Pro acompanha os editais. */
export function AssessoriaPlanos() {
  return (
    <section aria-labelledby="curso-planos" className="mx-auto flex w-full max-w-[900px] flex-col gap-3 rounded-[22px] bg-mata-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:p-6">
      <div className="min-w-0">
        <h2 id="curso-planos" className="text-balance text-[20px] font-bold leading-tight">
          Aprenda a participar de qualquer licitação
        </h2>
        <p className="mt-1 text-pretty text-[15px] text-ink-muted">
          O Pro acompanha os editais; o curso ensina do edital à proposta: exigências, documentos e como disputar.
        </p>
      </div>
      <Link
        href={HREF_CURSO}
        prefetch={false}
        className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-mata px-5 py-2.5 text-[15px] font-semibold text-raised hover:brightness-110"
      >
        Quero aprender
      </Link>
    </section>
  );
}
