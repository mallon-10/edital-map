import { CHAMADA_FINAL, jaEPro, type EstadoPlanos } from '@/lib/paginaPlanos';
import { formatarReais, PLANOS } from '@/lib/planos';
import { AcoesPlanos } from './BotaoAssinar';

const PRO = PLANOS.find((p) => p.id === 'pro')!;

/** Pino da marca no círculo, como no cartão do topo da inicial. */
function PinoGrande() {
  return (
    <svg viewBox="0 0 22 28" className="h-[38px] w-[30px]" aria-hidden="true">
      <path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f" />
      <path d="M15 0v6h6" fill="#b33a0e" />
      <circle cx="11" cy="11" r="3.5" fill="#ffe3d6" />
    </svg>
  );
}

/** Chamada final em cartão branco: o convite e a mesma ação do topo. */
export function ChamadaFinal({ pagamento, atual }: EstadoPlanos) {
  return (
    <section
      aria-labelledby="chamada-final"
      className="flex flex-col gap-5 rounded-[26px] bg-raised px-5 py-6 md:px-10 md:py-9 lg:flex-row lg:items-center lg:justify-between lg:rounded-[28px] lg:p-10"
    >
      <div className="flex items-center gap-5">
        <span aria-hidden="true" className="hidden size-[76px] shrink-0 items-center justify-center rounded-full bg-pin-soft shadow-[inset_0_0_0_3px_#ffffff,0_0_0_2px_#ffe3d6] md:flex">
          <PinoGrande />
        </span>
        <div>
          <h2 id="chamada-final" className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[32px]">
            {CHAMADA_FINAL.titulo} <span className="text-mata">{CHAMADA_FINAL.destaque}</span>
          </h2>
          {jaEPro(atual) ? null : (
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Pro por {formatarReais(PRO.centavosMes)}/mês ou {formatarReais(PRO.centavosAno)}/ano.{pagamento ? ' Cancele quando quiser.' : ''}
            </p>
          )}
        </div>
      </div>
      <div className="lg:shrink-0">
        <AcoesPlanos origem="final" pagamento={pagamento} atual={atual} />
      </div>
    </section>
  );
}
