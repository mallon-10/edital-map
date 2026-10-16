import { CONTORNO_VAZIO_COR, CORES_FAIXA } from '@/lib/painel';

export function LegendaMapa() {
  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <h2 className="text-[15px] font-bold">Como ler o mapa</h2>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {CORES_FAIXA.slice(1).map((cor) => (
          <span key={cor} className="h-2.5 flex-1 rounded-xs" style={{ background: cor }} />
        ))}
      </div>
      <p className="mt-1 flex justify-between font-mono text-[11px] text-ink-muted">
        <span>menos abertos</span>
        <span>200+ por UF</span>
      </p>
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
