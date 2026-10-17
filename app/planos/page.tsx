import type { Metadata } from 'next';
import { Cabecalho } from '@/components/Cabecalho';
import { BotaoQueroPlano } from '@/components/planos/BotaoQueroPlano';
import { AVISO_PLANOS, LINHAS_PLANOS, PLANOS, type Celula } from '@/lib/planos';

export const metadata: Metadata = { title: 'Planos' };

const EM_BREVE = 'whitespace-nowrap rounded-xs bg-ouro-soft px-1.5 py-0.5 text-[11px] font-semibold text-ouro-strong';
const CELULA = 'border-b border-line p-4 text-center align-middle';

function Valor({ c }: { c: Celula }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
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

export default function PaginaPlanos() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Planos</h1>
          <p className="text-[15px] text-ink-muted">
            Comece grátis. Quando precisar de mais buscas e editais por dia, de alertas e de editais salvos, escolha o Basic ou o Pro.
          </p>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-lg border border-line bg-raised text-[14px]">
            <caption className="sr-only">Comparação dos planos Grátis, Basic e Pro</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[38%] border-b border-line p-4 text-left align-bottom text-[13px] font-semibold text-ink-muted">
                  Recurso
                </th>
                {PLANOS.map((p) => (
                  <th key={p.id} id={p.id} scope="col" className={`scroll-mt-24 border-b border-line p-4 text-center align-bottom ${p.id === 'pro' ? 'bg-pin-soft' : ''}`}>
                    <span className="block text-[17px] font-bold">{p.nome}</span>
                    <span className="mt-1 block font-mono text-[13px] font-medium text-ink-muted">{p.preco}</span>
                    <span className="mt-3 block">
                      {p.id === 'gratis' ? (
                        <span className="text-[12px] font-normal text-ink-muted">Seu plano hoje</span>
                      ) : (
                        <BotaoQueroPlano plano={p.id} destaque={p.id === 'pro'} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS_PLANOS.map((l) => (
                <tr key={l.recurso}>
                  <th scope="row" className="border-b border-line p-4 text-left font-semibold">{l.recurso}</th>
                  <td className={CELULA}><Valor c={l.gratis} /></td>
                  <td className={CELULA}><Valor c={l.basic} /></td>
                  <td className={`${CELULA} bg-pin-soft/40`}><Valor c={l.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">{AVISO_PLANOS}</p>
      </main>
    </>
  );
}
