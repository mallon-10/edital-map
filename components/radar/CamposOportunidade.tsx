'use client';

import { MODALIDADES } from '@/lib/filtros';
import { LIMITES_RADAR, type RascunhoRadar } from '@/lib/radar';
import { CampoTermos } from './CampoTermos';

const CAMPO = 'h-11 w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] font-normal text-ink';

/** Valor, modalidades, só ME/EPP e palavras para excluir: a 3ª etapa do radar e a parte final do formulário de alerta. */
export function CamposOportunidade({ d, mudar }: { d: RascunhoRadar; mudar: (parte: Partial<RascunhoRadar>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Valor estimado (opcional)</legend>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Mínimo (R$)
          <input inputMode="decimal" value={d.valorMin} onChange={(e) => mudar({ valorMin: e.target.value })} placeholder="Sem mínimo" className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Máximo (R$)
          <input inputMode="decimal" value={d.valorMax} onChange={(e) => mudar({ valorMax: e.target.value })} placeholder="Sem máximo" className={CAMPO} />
        </label>
        <p className="text-[13px] text-ink-muted sm:col-span-2">Com valor mínimo ou máximo, editais sem valor informado ficam de fora.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Modalidades (opcional; nenhuma marcada = todas)</legend>
        <div className="flex flex-col gap-1">
          {MODALIDADES.map((mo) => (
            <label key={mo.id} className="flex min-h-11 items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={d.modalidades.includes(mo.id)}
                onChange={(e) => mudar({ modalidades: e.target.checked ? [...d.modalidades, mo.id] : d.modalidades.filter((x) => x !== mo.id) })}
                className="size-5 shrink-0 accent-[var(--color-pin)]"
              />
              {mo.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-start gap-3 text-[15px]">
        <input type="checkbox" checked={d.soMeEpp} onChange={(e) => mudar({ soMeEpp: e.target.checked })} className="mt-0.5 size-5 shrink-0 accent-[var(--color-pin)]" />
        <span>
          <span className="font-semibold">Só exclusivas para ME/EPP</span>
          <span className="block text-[13px] text-ink-muted">Quando o órgão informa no PNCP que todos os itens são exclusivos.</span>
        </span>
      </label>
      <CampoTermos
        rotulo="Palavras para excluir (opcional)"
        ajuda="Editais com estas palavras no objeto não aparecem. Ex.: escolar."
        termos={d.termosExcluir}
        max={LIMITES_RADAR.excluir}
        tamanho={LIMITES_RADAR.tamanhoExcluir}
        aoMudar={(termosExcluir) => mudar({ termosExcluir })}
      />
    </div>
  );
}
