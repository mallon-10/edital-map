'use client';

import { useState } from 'react';
import { LINHAS_PLANOS, PLANOS, type Celula, type Periodo } from '@/lib/planos';
import { AlternadorPeriodo } from './AlternadorPeriodo';
import { BotaoQueroPlano } from './BotaoQueroPlano';
import { CartoesPlanos } from './CartoesPlanos';
import { PrecoDoPlano } from './PrecoDoPlano';

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

/** Alternador Mensal | Anual + cartões (celular) + tabela (a partir de md). */
export function PlanosVista() {
  const [periodo, setPeriodo] = useState<Periodo>('mensal');
  return (
    <>
      <AlternadorPeriodo periodo={periodo} onChange={setPeriodo} />
      <CartoesPlanos periodo={periodo} />
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-lg border border-line bg-raised text-[14px]">
          <caption className="sr-only">Comparação dos planos Grátis, Basic e Pro</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[38%] border-b border-line p-4 text-left align-bottom text-[13px] font-semibold text-ink-muted">
                Recurso
              </th>
              {PLANOS.map((p) => (
                <th key={p.id} scope="col" className={`border-b border-line p-4 text-center align-bottom ${p.id === 'pro' ? 'bg-pin-soft' : ''}`}>
                  <span className="block text-[17px] font-bold">{p.nome}</span>
                  <span className="mt-1 block">
                    <PrecoDoPlano centavosMes={p.centavosMes} periodo={periodo} />
                  </span>
                  <span className="mt-3 block">
                    {p.id === 'gratis' ? (
                      <span className="text-[12px] font-normal text-ink-muted">Seu plano hoje</span>
                    ) : (
                      <BotaoQueroPlano plano={p.id} periodo={periodo} destaque={p.id === 'pro'} />
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
    </>
  );
}
