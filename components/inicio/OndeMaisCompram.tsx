import { numero } from '@/lib/formato';
import type { MunicipioPainel } from '@/lib/painel';
import type { Cidade } from '@/lib/tipos';

/** Barras dos municípios com mais editais na busca atual; clicar filtra a lista. */
export function OndeMaisCompram({ municipios, termo, aoEscolher }: { municipios: MunicipioPainel[]; termo: string; aoEscolher: (c: Cidade) => void }) {
  const maximo = Math.max(1, ...municipios.map((m) => m.qtd));
  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <h2 className="text-[15px] font-bold">Onde mais compram</h2>
      {municipios.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Sem editais para essa busca.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {municipios.map((m) => (
            <li key={m.ibge}>
              <button
                type="button"
                onClick={() => aoEscolher({ ibge: m.ibge, nome: m.nome, uf: m.uf })}
                className="grid w-full grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-left text-xs hover:opacity-80"
              >
                <span className="truncate font-semibold">
                  {m.nome}/{m.uf}
                </span>
                <span className="h-2 rounded-full bg-sunken">
                  <span className="block h-2 rounded-full bg-ink" style={{ width: `${Math.round((m.qtd / maximo) * 100)}%` }} />
                </span>
                <span className="font-mono">{numero(m.qtd)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-ink-muted">{termo.trim() ? `${termo.trim()} · abertos agora` : 'Todos os editais · abertos agora'}</p>
    </section>
  );
}
