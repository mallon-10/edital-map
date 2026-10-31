import { IconeCheck } from '@/components/inicio/Icones';
import { CONFIANCA } from '@/lib/paginaPlanos';
import { H2, MONO } from './estilos';

/** O que sustenta a assinatura, só com fatos do produto: fonte, atualização, alertas, pagamento e cancelamento. */
export function ConfiancaPlanos() {
  return (
    <section aria-labelledby="confianca" className="mx-auto w-full max-w-[900px]">
      <div className="mb-3.5 flex flex-col gap-1.5 px-1">
        <p className={MONO}>Transparência</p>
        <h2 id="confianca" className={H2}>
          Como o Edital Map funciona
        </h2>
      </div>
      <ul className="m-0 list-none divide-y divide-line rounded-[22px] bg-raised p-0">
        {CONFIANCA.map((c) => (
          <li key={c.titulo} className="grid grid-cols-[20px_1fr] gap-x-2.5 px-5 py-4">
            <IconeCheck className="mt-0.5 size-5 text-mata" />
            <div>
              <p className="text-[16px] font-semibold">{c.titulo}</p>
              <p className="mt-0.5 text-[14.5px] text-ink-muted">{c.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
