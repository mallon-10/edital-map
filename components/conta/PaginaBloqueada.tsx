import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { IconeCadeado } from '@/components/inicio/Icones';
import { BLOQUEIO_PRO, BOTAO_LIBERAR_PRO, type RecursoPro } from '@/lib/bloqueioPro';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import type { RascunhoRadar } from '@/lib/radar';
import { VitrineAlertas } from './VitrineAlertas';
import { VitrineRadar } from './VitrineRadar';

type Props = {
  recurso: RecursoPro;
  logado: boolean;
  incerto?: boolean;
  /** Filtros que vieram de uma busca ou de um edital: a prévia do alerta (só em /alertas/novo). */
  previa?: RascunhoRadar | null;
  /** Para onde "Já sou Pro: entrar" volta, quando não é a área em si. */
  voltar?: string;
  /** A busca de onde a pessoa veio, para "Continuar pesquisando grátis". */
  busca?: string;
};

/**
 * Área só do Pro vista pelo grátis. Meu Radar e Alertas viram vitrine: mostram o que o recurso faz, com demonstração
 * identificada. Minhas Oportunidades: um exemplo genérico da página, apagado e fora do toque e do leitor de tela, com o
 * cadeado e "Liberar o Pro" no meio. Nada da conta é lido antes daqui. Sem conta: "Já sou Pro: entrar" volta para a
 * mesma área. Plano não confirmado (consulta falhou): pede para tentar de novo, sem o cadeado.
 */
export function PaginaBloqueada({ recurso, logado, incerto = false, previa = null, voltar, busca }: Props) {
  const t = BLOQUEIO_PRO[recurso];
  const entrar = logado ? null : (
    <Link
      href={`/entrar?voltar=${encodeURIComponent(voltar ?? t.caminho)}`}
      prefetch={false}
      className="inline-flex h-11 items-center text-sm font-semibold text-pin-strong underline-offset-2 hover:underline"
    >
      Já sou Pro: entrar
    </Link>
  );
  return (
    <>
      <Cabecalho plano={incerto ? undefined : { plano: 'gratis', dono: false }} />
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-6 lg:px-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">{t.nome}</h1>
        {incerto ? (
          <p role="status" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] font-semibold text-pin-strong">
            {MENSAGENS_LIMITE_CONTA.planoIndisponivel}
          </p>
        ) : recurso === 'radar' ? (
          <VitrineRadar entrar={entrar} />
        ) : recurso === 'alertas' ? (
          <VitrineAlertas previa={previa} busca={busca} entrar={entrar} />
        ) : (
          <section aria-labelledby="titulo-bloqueio" className="relative min-h-[480px]">
            <div aria-hidden="true" inert className="pointer-events-none select-none opacity-35 blur-[2px]">
              <Exemplo />
            </div>
            <div className="absolute inset-0 flex items-start justify-center px-2 pt-10 sm:pt-16">
              <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-lg border border-line bg-raised p-6 text-center shadow-[0_12px_32px_rgba(12,35,64,0.16)]">
                <span className="flex size-14 items-center justify-center rounded-full bg-pin-soft text-pin-strong">
                  <IconeCadeado className="size-7" />
                </span>
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-pin-strong">Plano Pro</p>
                <h2 id="titulo-bloqueio" className="text-[20px] font-bold leading-snug">
                  {t.titulo}
                </h2>
                <p className="text-[15px] text-ink-muted">{t.texto}</p>
                <Link href="/planos" prefetch={false} className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin sm:w-auto">
                  {BOTAO_LIBERAR_PRO}
                </Link>
                {entrar}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

const barra = 'block rounded-sm bg-line';

/** Exemplo fixo de Minhas Oportunidades (nada da conta): o desenho da página, sem dados. */
function Exemplo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-line pb-2">
        {['Todos', 'Em análise', 'Vou participar', 'Descartados'].map((r) => (
          <span key={r} className="inline-flex h-10 items-center rounded-sm border border-line bg-raised px-3 text-sm font-semibold">
            {r}
          </span>
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-md border border-line bg-raised p-4">
          <div className="flex items-start justify-between gap-4">
            <span className={`${barra} h-4 w-2/3`} />
            <span className={`${barra} h-4 w-20`} />
          </div>
          <span className={`${barra} h-3 w-1/2`} />
          <span className="block h-6 w-28 rounded-sm bg-ouro-soft" />
        </div>
      ))}
    </div>
  );
}
