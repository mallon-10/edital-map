import { Seta } from '@/components/inicio/Icones';
import { PERGUNTAS } from '@/lib/paginaPlanos';
import { H2, MONO } from './estilos';

/** Perguntas frequentes em details (abre e fecha sem script, com teclado e leitor de tela). */
export function PerguntasPlanos() {
  return (
    <section aria-labelledby="perguntas" className="grid items-start gap-3.5 md:grid-cols-[1fr_1.9fr] md:gap-8">
      <div className="flex flex-col gap-1.5 px-1 md:mt-[18px]">
        <p className={MONO}>Perguntas frequentes</p>
        <h2 id="perguntas" className={H2}>
          Antes de assinar
        </h2>
      </div>
      <div className="divide-y divide-line rounded-[22px] bg-raised px-5">
        {PERGUNTAS.map((p) => (
          <details key={p.pergunta} className="group">
            <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-[16px] font-semibold hover:text-pin-strong [&::-webkit-details-marker]:hidden">
              {p.pergunta}
              <Seta className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="max-w-[66ch] pb-[18px] text-[15px] text-ink-muted">{p.resposta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
