import type { ReactNode } from 'react';
import { ChamadaPro, OfertaVista } from '@/components/ChamadaPro';
import { PILULA_PIN } from '@/components/planos/estilos';
import { VITRINE_RADAR } from '@/lib/bloqueioPro';
import { hrefAssinar } from '@/lib/paginaPlanos';
import { ROTINA_ENVIO } from '@/lib/planos';
import { PreviaRadar } from './PreviaRadar';

/** Meu Radar para quem não assina: o que ele entrega, com a demonstração ao lado e a chamada com o preço. */
export function VitrineRadar({ entrar }: { entrar: ReactNode }) {
  return (
    <section aria-labelledby="titulo-vitrine" className="flex flex-col gap-3 overflow-hidden rounded-[26px] bg-raised p-3 lg:flex-row lg:rounded-[28px]">
      <OfertaVista origem="radar" />
      <div className="flex min-w-0 flex-col gap-4 p-3 lg:flex-[1_1_50%] lg:justify-center lg:gap-5 lg:p-7">
        <h2 id="titulo-vitrine" className="text-balance text-[26px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[36px]">
          {VITRINE_RADAR.titulo}
        </h2>
        <p className="text-pretty text-[16.5px] text-ink-muted">{VITRINE_RADAR.texto}</p>
        <p className="text-pretty text-[14.5px] text-ink-muted">{ROTINA_ENVIO}</p>
        <div className="flex flex-col items-start gap-1">
          <ChamadaPro href={hrefAssinar('mensal')} origem="radar" className={`${PILULA_PIN} w-full text-balance text-center leading-tight sm:w-auto`}>
            {VITRINE_RADAR.cta}
          </ChamadaPro>
          {entrar}
        </div>
      </div>
      <PreviaRadar />
    </section>
  );
}
