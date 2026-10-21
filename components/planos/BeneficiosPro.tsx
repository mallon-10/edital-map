import { BENEFICIOS_PRO, EM_PREPARACAO } from '@/lib/paginaPlanos';
import { H2, MONO, QUADRADO, TOM } from './estilos';
import { IconePlanos } from './IconePlanos';

/** O que o Pro entrega hoje (todos "Disponível") e, à parte, o que ainda está em preparação e não faz parte do Pro. */
export function BeneficiosPro() {
  return (
    <section aria-labelledby="beneficios-pro">
      <div className="mb-3.5 flex flex-col gap-1.5 px-1">
        <p className={MONO}>O que o Pro faz por você</p>
        <h2 id="beneficios-pro" className={H2}>
          Menos tempo procurando, mais tempo preparando proposta
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {BENEFICIOS_PRO.map((b) => (
          <article key={b.titulo} className="flex flex-col gap-2.5 rounded-[22px] bg-raised p-[22px] transition-shadow hover:shadow-[inset_0_0_0_1px_#847c6a] lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <span aria-hidden="true" className={`${QUADRADO} ${TOM[b.tom]}`}>
                <IconePlanos nome={b.icone} className="size-[22px]" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mata-soft px-2.5 py-1 text-[12px] font-semibold text-mata">
                <span aria-hidden="true" className="size-[7px] rounded-full bg-mata" />
                Disponível
              </span>
            </div>
            <h3 className="mt-1 text-[18px] font-bold leading-snug lg:text-[19px]">{b.titulo}</h3>
            <p className="text-[14.5px] text-ink-muted lg:text-[15px]">{b.texto}</p>
          </article>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[22px] px-[18px] py-3.5 text-[14px] text-ink-muted shadow-[inset_0_0_0_1px_#ddd6c6]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ouro-soft px-2.5 py-1 text-[12px] font-semibold text-ouro-strong">
          <span aria-hidden="true" className="size-[7px] rounded-full bg-ouro" />
          Em preparação
        </span>
        <span className="min-w-0 flex-[1_1_260px]">{EM_PREPARACAO.texto}</span>
      </p>
    </section>
  );
}
