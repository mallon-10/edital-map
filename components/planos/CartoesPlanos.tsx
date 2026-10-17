import { BotaoQueroPlano } from '@/components/planos/BotaoQueroPlano';
import { LINHAS_PLANOS, PLANOS, type Celula } from '@/lib/planos';

const EM_BREVE = 'whitespace-nowrap rounded-xs bg-ouro-soft px-1.5 py-0.5 text-[11px] font-semibold text-ouro-strong';

function Valor({ c }: { c: Celula }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5 text-right">
      {c.valor === true ? (
        <>
          <span aria-hidden="true" className="text-base font-bold text-mata">✓</span>
          <span className="sr-only">Incluído</span>
        </>
      ) : c.valor === false ? (
        <>
          <span aria-hidden="true" className="text-ink-muted">—</span>
          <span className="sr-only">Não incluído</span>
        </>
      ) : (
        <span>{c.valor}</span>
      )}
      {c.emBreve ? <span className={EM_BREVE}>em breve</span> : null}
    </span>
  );
}

/** Os planos em cartões empilhados (celular); a tabela fica para telas largas. */
export function CartoesPlanos() {
  return (
    <ul className="flex list-none flex-col gap-4 p-0 md:hidden" data-testid="cartoes-planos">
      {PLANOS.map((p) => (
        <li
          key={p.id}
          className={`min-w-0 rounded-lg border bg-raised p-4 ${p.id === 'pro' ? 'border-pin bg-pin-soft/40' : 'border-line'}`}
        >
          <h2 className="text-[17px] font-bold">{p.nome}</h2>
          <p className="mt-1 font-mono text-[13px] font-medium text-ink-muted">{p.preco}</p>
          <div className="mt-3">
            {p.id === 'gratis' ? (
              <span className="text-[12px] text-ink-muted">Seu plano hoje</span>
            ) : (
              <BotaoQueroPlano plano={p.id} destaque={p.id === 'pro'} />
            )}
          </div>
          <dl className="mt-3 flex flex-col text-[14px]">
            {LINHAS_PLANOS.map((l) => (
              <div key={l.recurso} className="flex items-start justify-between gap-3 border-t border-line py-2.5">
                <dt className="min-w-0 flex-1">{l.recurso}</dt>
                <dd className="m-0 max-w-[45%] shrink-0 font-semibold">
                  <Valor c={l[p.id]} />
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
