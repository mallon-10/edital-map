import { numero } from '@/lib/formato';
import { CONTORNO_VAZIO_COR, CORES_FAIXA, faixasRelativas } from '@/lib/painel';

/** Legenda do mapa: as cores são relativas à busca atual, então os números de cada faixa vêm de `porUf`. */
export function LegendaMapa({ porUf }: { porUf: Record<string, number> }) {
  const { limites } = faixasRelativas(porUf);
  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <h2 className="text-[15px] font-bold">Como ler o mapa</h2>
      <p className="mt-1 text-xs text-ink-muted">Cor do estado: editais abertos nesta busca, do menor para o maior.</p>
      {limites.length > 0 ? (
        <ul className="mt-3 grid grid-cols-4 gap-1">
          {limites.map((l) => (
            <li key={l.faixa} className="flex flex-col gap-1" style={{ gridColumnStart: l.faixa }}>
              <span className="h-2.5 rounded-xs" style={{ background: CORES_FAIXA[l.faixa] }} aria-hidden="true" />
              {/* Duas linhas ("51" / "a 258") para os números grandes caberem na coluna. */}
              <span className="font-mono text-[11px] leading-4 text-ink-muted">
                {numero(l.de)}
                {l.ate !== l.de ? <span className="block">a {numero(l.ate)}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 font-mono text-[11px] text-ink-muted">Nenhum estado com editais nesta busca.</p>
      )}
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <span className="size-2.5 rounded-full bg-pin" aria-hidden="true" />
        Tamanho = valor estimado
      </p>
      <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
        <span className="size-2.5 rounded-xs border-[1.5px] bg-raised" style={{ borderColor: CONTORNO_VAZIO_COR }} aria-hidden="true" />
        Contorno azul: estado sem edital nesta busca
      </p>
      <p className="mt-2 text-xs text-ink-muted">O ponto é a sede do órgão, não o local de entrega.</p>
    </section>
  );
}
