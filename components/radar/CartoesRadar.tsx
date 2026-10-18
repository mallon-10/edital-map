import Link from 'next/link';
import { numero } from '@/lib/formato';
import type { ContagensRadar } from '@/lib/radar';
import type { FiltroStatus } from '@/lib/salvos';

const CARTAO = 'flex flex-col gap-1 rounded-md border border-line bg-raised p-4';

/** Cartões com contagens reais do radar e, com os salvos da conta, "Editais salvos" (no máximo 4). */
export function CartoesRadar({
  contagens,
  primeiraVisita,
  salvos,
}: {
  contagens: ContagensRadar;
  primeiraVisita: boolean;
  salvos?: Record<FiltroStatus, number>;
}) {
  const cartoes = [
    { rotulo: 'Oportunidades para o seu perfil', valor: contagens.total, nota: 'Editais abertos que combinam com o seu radar' },
    { rotulo: primeiraVisita ? 'Novas nas últimas 24 horas' : 'Novas desde a sua última visita', valor: contagens.novas, nota: 'Publicadas no PNCP' },
    { rotulo: 'Prazo próximo', valor: contagens.prazoProximo, nota: 'Encerram em até 7 dias' },
  ];
  return (
    <section aria-label="Resumo do radar" className={`grid grid-cols-1 gap-3 ${salvos ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {cartoes.map((c) => (
        <div key={c.rotulo} className={CARTAO}>
          <p className="text-[13px] font-semibold text-ink-muted">{c.rotulo}</p>
          <p className="font-mono text-[28px] font-semibold leading-none">{numero(c.valor)}</p>
          <p className="text-xs text-ink-muted">{c.nota}</p>
        </div>
      ))}
      {salvos ? (
        <Link href="/oportunidades" prefetch={false} className={`${CARTAO} hover:border-line-strong`}>
          <span className="text-[13px] font-semibold text-ink-muted">Editais salvos</span>
          <span className="font-mono text-[28px] font-semibold leading-none">{numero(salvos.todos)}</span>
          <span className="text-xs text-ink-muted">
            {numero(salvos.analise)} em análise · {numero(salvos.participar)} vou participar
          </span>
        </Link>
      ) : null}
    </section>
  );
}
