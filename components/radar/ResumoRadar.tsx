import { resumoDoRadar, type Radar } from '@/lib/radar';
import type { Cidade } from '@/lib/tipos';

/** O que o radar monitora (produtos, área e filtros). O atalho para editar fica no topo da página. */
export function ResumoRadar({ radar, cidades }: { radar: Radar; cidades: Cidade[] }) {
  const r = resumoDoRadar(radar, cidades);
  return (
    <section aria-label="Seu radar" className="flex flex-col gap-2 rounded-md border border-line bg-raised p-4">
      <ul aria-label="Produtos que você monitora" className="flex flex-wrap items-center gap-2">
        {r.produtos.map((p) => (
          <li key={p} className="rounded-sm bg-pin-soft px-2.5 py-1 text-sm font-semibold text-pin-strong">
            {p}
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-ink-muted">{[r.local, ...r.extras].join(' · ')}</p>
    </section>
  );
}
