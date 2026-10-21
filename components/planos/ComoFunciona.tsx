import { PASSOS } from '@/lib/paginaPlanos';
import { H2, MONO, QUADRADO, TOM } from './estilos';
import { IconePlanos } from './IconePlanos';

/** Três passos em cartões brancos (a ordem é a do uso: filtro, alerta, e-mail). */
export function ComoFunciona() {
  return (
    <section aria-labelledby="como-funciona">
      <div className="mb-3.5 flex flex-col gap-1.5 px-1">
        <p className={MONO}>Como funciona</p>
        <h2 id="como-funciona" className={H2}>
          Três passos, uma vez só
        </h2>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="flex gap-3.5 rounded-[22px] bg-raised p-[18px] sm:flex-col lg:p-6">
            <span aria-hidden="true" className={`${QUADRADO} ${TOM.creme}`}>
              <IconePlanos nome={p.icone} className="size-[22px]" />
            </span>
            <div>
              <span aria-hidden="true" className="block font-mono text-[11px] font-medium tracking-[0.08em] text-ink-muted">PASSO {i + 1}</span>
              <h3 className="text-[17px] font-bold leading-snug lg:text-[19px]">{p.titulo}</h3>
              <p className="mt-1 text-[14.5px] text-ink-muted lg:text-[15px]">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
