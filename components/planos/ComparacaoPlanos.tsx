import { IconeCheck, Seta } from '@/components/inicio/Icones';
import { DIFERENCAS, INCLUIDO_NOS_DOIS, type LinhaDiferenca } from '@/lib/paginaPlanos';
import { H2, MONO } from './estilos';

const CELULA = 'border-b border-line px-[18px] py-[15px] text-center align-middle';

function Valor({ v }: { v: LinhaDiferenca['pro'] }) {
  if (v === true) {
    return (
      <>
        <span aria-hidden="true" className="text-[17px] font-bold text-mata">✓</span>
        <span className="sr-only">Incluído</span>
      </>
    );
  }
  if (v === false) {
    return (
      <>
        <span aria-hidden="true" className="text-ink-muted">—</span>
        <span className="sr-only">Não incluído</span>
      </>
    );
  }
  return <>{v}</>;
}

/** O que muda na rotina entre Grátis e Pro; o que os dois têm fica num bloco que abre e fecha. */
export function ComparacaoPlanos() {
  return (
    <section aria-labelledby="comparacao" className="mx-auto w-full max-w-[900px]">
      <div className="mb-3.5 flex flex-col gap-1.5 px-1">
        <p className={MONO}>Comparação</p>
        <h2 id="comparacao" className={H2}>
          O que muda na sua rotina
        </h2>
      </div>
      <div className="overflow-x-auto rounded-[22px] bg-raised">
        <table className="w-full border-collapse text-[15px]">
          <caption className="sr-only">Diferenças entre os planos Grátis e Pro</caption>
          <thead>
            <tr>
              <th scope="col" className={`border-b border-line px-[18px] py-[15px] text-left ${MONO}`}>No dia a dia</th>
              <th scope="col" className={`${CELULA} w-[24%] ${MONO}`}>Grátis</th>
              <th scope="col" className={`${CELULA} w-[24%] bg-pin-soft/50 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-pin-strong lg:text-xs`}>
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {DIFERENCAS.map((d, i) => {
              const ultima = i === DIFERENCAS.length - 1 ? 'border-b-0' : '';
              return (
                <tr key={d.recurso}>
                  <th scope="row" className={`border-b border-line px-[18px] py-[15px] text-left font-semibold ${ultima}`}>{d.recurso}</th>
                  <td className={`${CELULA} ${ultima}`}><Valor v={d.gratis} /></td>
                  <td className={`${CELULA} bg-pin-soft/50 font-semibold ${ultima}`}><Valor v={d.pro} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="group mt-3 rounded-[22px] bg-raised">
        <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-3 px-5 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
          Incluído nos dois planos
          <Seta className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ul className="m-0 grid list-none gap-2.5 px-5 pb-[18px] text-[15px]">
          {INCLUIDO_NOS_DOIS.map((i) => (
            <li key={i} className="grid grid-cols-[20px_1fr] gap-2.5">
              <IconeCheck className="mt-px size-5 text-mata" />
              {i}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
