import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChamadaPro, OfertaVista } from '@/components/ChamadaPro';
import { EmailIlustrativo } from '@/components/planos/EmailIlustrativo';
import { PILULA_LINHA, PILULA_PIN } from '@/components/planos/estilos';
import { PREVIA_ALERTA, VITRINE_ALERTAS } from '@/lib/bloqueioPro';
import { hrefAssinar } from '@/lib/paginaPlanos';
import { PRECO_PRO_MENSAL, ROTINA_ENVIO } from '@/lib/planos';
import { corpoDoRascunho, resumoDoRadar, type RascunhoRadar } from '@/lib/radar';
import { GuardarRascunho } from './GuardarRascunho';

const CTA = `${PILULA_PIN} w-full text-balance text-center leading-tight sm:w-auto`;

type Props = { previa: RascunhoRadar | null; busca?: string; entrar: ReactNode };

/** Prévia dos filtros da busca. É só uma prévia: nada é gravado na conta, e o texto diz que o alerta ainda não existe. */
function PreviaDoAlerta({ previa, busca, entrar }: { previa: RascunhoRadar; busca?: string; entrar: ReactNode }) {
  const { produtos, local, extras } = resumoDoRadar(corpoDoRascunho(previa, { pular: false }), previa.municipios);
  return (
    <div className="flex min-w-0 flex-col gap-4 p-3 lg:flex-[1_1_52%] lg:justify-center lg:gap-5 lg:p-7">
      <GuardarRascunho rascunho={previa} />
      <h2 id="titulo-vitrine" className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[36px]">
        {PREVIA_ALERTA.titulo}
      </h2>
      <dl className="m-0 flex flex-col gap-2.5 rounded-[18px] bg-surface p-4 text-[15px]">
        <div>
          <dt className="text-[13px] text-ink-muted">O que acompanhar</dt>
          <dd className="font-semibold">{produtos.length ? produtos.join(', ') : PREVIA_ALERTA.semProdutos}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-muted">Onde</dt>
          <dd className="font-semibold">{local}</dd>
        </div>
        {extras.length ? (
          <div>
            <dt className="text-[13px] text-ink-muted">Filtros</dt>
            <dd className="font-semibold">{extras.join(' · ')}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[13px] text-ink-muted">Quando</dt>
          <dd className="font-semibold">{ROTINA_ENVIO}</dd>
        </div>
      </dl>
      <p role="note" className="text-pretty rounded-[14px] bg-pin-soft px-4 py-3 text-[14px] text-pin-strong">{PREVIA_ALERTA.aviso}</p>
      <div className="flex flex-col flex-wrap items-stretch gap-2.5 sm:flex-row sm:items-center">
        <ChamadaPro href={hrefAssinar('mensal')} origem="alerta_previa" segmento={produtos[0] ?? null} className={CTA}>
          {PREVIA_ALERTA.cta}
        </ChamadaPro>
        <Link href={busca ?? '/'} prefetch={false} className={`${PILULA_LINHA} text-center leading-tight`}>
          {PREVIA_ALERTA.voltar}
        </Link>
      </div>
      {entrar}
    </div>
  );
}

/** Como funciona e a chamada, quando a pessoa chegou aos Alertas sem uma busca. */
function ComoFuncionam({ entrar }: { entrar: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 p-3 lg:flex-[1_1_52%] lg:justify-center lg:gap-5 lg:p-7">
      <h2 id="titulo-vitrine" className="text-balance text-[26px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[36px]">
        {VITRINE_ALERTAS.titulo}
      </h2>
      <p className="text-pretty text-[16.5px] text-ink-muted">{VITRINE_ALERTAS.texto}</p>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {VITRINE_ALERTAS.passos.map((p, i) => (
          <li key={p} className="grid grid-cols-[32px_1fr] items-center gap-3 text-[15.5px] font-semibold">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-pin-soft font-mono text-[14px] font-bold text-pin-strong">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-start gap-1">
        <ChamadaPro href={hrefAssinar('mensal')} origem="alertas" className={CTA}>
          {VITRINE_ALERTAS.cta}
        </ChamadaPro>
        <p className="font-mono text-[12.5px] text-ink-muted">Pro: {PRECO_PRO_MENSAL}</p>
        {entrar}
      </div>
    </div>
  );
}

/** Alertas para quem não assina: a prévia do alerta da busca ou, sem busca, como funciona; o e-mail de exemplo ao lado. */
export function VitrineAlertas({ previa, busca, entrar }: Props) {
  return (
    <section aria-labelledby="titulo-vitrine" className="flex flex-col overflow-hidden rounded-[26px] bg-raised p-3 lg:flex-row lg:rounded-[28px]">
      <OfertaVista origem={previa ? 'alerta_previa' : 'alertas'} />
      {previa ? <PreviaDoAlerta previa={previa} busca={busca} entrar={entrar} /> : <ComoFuncionam entrar={entrar} />}
      <EmailIlustrativo />
    </section>
  );
}
