import { IconeCalendario, IconeRadar, IconeSino } from '@/components/inicio/Icones';
import { jaEPro, TOPO, type EstadoPlanos } from '@/lib/paginaPlanos';
import { formatarReais, PLANOS } from '@/lib/planos';
import { AcoesPlanos } from './BotaoAssinar';
import { EmailIlustrativo } from './EmailIlustrativo';
import { MONO } from './estilos';

const ICONES = [IconeSino, IconeRadar, IconeCalendario];
const PRO = PLANOS.find((p) => p.id === 'pro')!;

/** Cartão do topo da página de planos, no desenho do cartão do topo da inicial: texto à esquerda, o e-mail à direita. */
export function TopoPlanos({ pagamento, atual }: EstadoPlanos) {
  return (
    <section aria-labelledby="titulo-planos" className="flex flex-col overflow-hidden rounded-[26px] bg-raised lg:min-h-[500px] lg:flex-row lg:rounded-[28px]">
      <div className="flex min-w-0 flex-col gap-5 px-5 pb-6 pt-5 lg:flex-[1_1_52%] lg:justify-between lg:gap-7 lg:p-10">
        <p className={MONO}>{TOPO.sobretitulo}</p>
        <div>
          <h1 id="titulo-planos" className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[40px] lg:text-[50px] lg:tracking-[-0.025em]">
            {TOPO.titulo} <span className="text-mata">{TOPO.destaque}</span>
          </h1>
          <p className="mt-3 max-w-[54ch] text-[16.5px] text-ink-muted">{TOPO.subtitulo}</p>
        </div>
        <ul aria-label="O que o Pro faz" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {TOPO.beneficios.map((b, i) => {
            const Icone = ICONES[i];
            return (
              <li key={b} className="inline-flex h-10 items-center gap-2 rounded-full bg-surface pl-2.5 pr-3.5 text-[14px] font-semibold">
                <Icone className="size-[18px] text-pin-strong" />
                {b}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-3">
          <AcoesPlanos origem="topo" pagamento={pagamento} atual={atual} rotulo={TOPO.cta} />
          {jaEPro(atual) ? null : (
            <p className="font-mono text-[12.5px] text-ink-muted">
              Pro: <span className="text-ink">{formatarReais(PRO.centavosMes)}/mês</span> ou{' '}
              <span className="text-ink">{formatarReais(PRO.centavosAno)}/ano</span>
              {pagamento ? ' · Pix Automático ou cartão · cancele quando quiser' : null}
            </p>
          )}
        </div>
      </div>
      <EmailIlustrativo />
    </section>
  );
}
