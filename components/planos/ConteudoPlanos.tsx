import type { EstadoPlanos } from '@/lib/paginaPlanos';
import type { Periodo } from '@/lib/planos';
import { BeneficiosPro } from './BeneficiosPro';
import { ChamadaFinal } from './ChamadaFinal';
import { ComoFunciona } from './ComoFunciona';
import { ComparacaoPlanos } from './ComparacaoPlanos';
import { PerguntasPlanos } from './PerguntasPlanos';
import { PeriodoProvider } from './Periodo';
import { SecaoPrecos } from './SecaoPrecos';
import { TopoPlanos } from './TopoPlanos';

/**
 * Página de planos (spec 2026-10-21-planos-conversao-design.md), no visual da inicial nova: topo, como funciona, preços,
 * benefícios, comparação, perguntas e chamada final. O período do alternador vale para todos os "Assinar o Pro".
 */
export function ConteudoPlanos({ pagamento, atual, periodoInicial = 'mensal' }: EstadoPlanos & { periodoInicial?: Periodo }) {
  return (
    <PeriodoProvider inicial={periodoInicial}>
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pb-10 pt-2 md:gap-14 lg:gap-16 lg:px-6 lg:pb-12">
        <TopoPlanos pagamento={pagamento} atual={atual} />
        <ComoFunciona />
        <SecaoPrecos pagamento={pagamento} atual={atual} />
        <BeneficiosPro />
        <ComparacaoPlanos />
        <PerguntasPlanos />
        <ChamadaFinal pagamento={pagamento} atual={atual} />
      </main>
    </PeriodoProvider>
  );
}
