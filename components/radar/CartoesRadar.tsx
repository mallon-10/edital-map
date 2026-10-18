import { numero } from '@/lib/formato';
import type { ContagensRadar } from '@/lib/radar';

/** Três cartões com contagens reais do radar (no máximo 4; "Editais salvos" entra na Fase 4). */
export function CartoesRadar({ contagens, primeiraVisita }: { contagens: ContagensRadar; primeiraVisita: boolean }) {
  const cartoes = [
    { rotulo: 'Oportunidades para o seu perfil', valor: contagens.total, nota: 'Editais abertos que combinam com o seu radar' },
    { rotulo: primeiraVisita ? 'Novas nas últimas 24 horas' : 'Novas desde a sua última visita', valor: contagens.novas, nota: 'Publicadas no PNCP' },
    { rotulo: 'Prazo próximo', valor: contagens.prazoProximo, nota: 'Encerram em até 7 dias' },
  ];
  return (
    <section aria-label="Resumo do radar" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cartoes.map((c) => (
        <div key={c.rotulo} className="flex flex-col gap-1 rounded-md border border-line bg-raised p-4">
          <p className="text-[13px] font-semibold text-ink-muted">{c.rotulo}</p>
          <p className="font-mono text-[28px] font-semibold leading-none">{numero(c.valor)}</p>
          <p className="text-xs text-ink-muted">{c.nota}</p>
        </div>
      ))}
    </section>
  );
}
