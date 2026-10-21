import { numero } from '@/lib/formato';
import type { MunicipioPainel } from '@/lib/painel';
import type { Cidade } from '@/lib/tipos';
import { IconeMapa } from './Icones';

type Props = {
  municipios: MunicipioPainel[];
  termo: string;
  aoEscolher: (c: Cidade) => void;
  /** Enquanto os pontos do mapa não chegaram, a lista vazia não quer dizer "sem editais". */
  carregando?: boolean;
};

/** Barras dos municípios com mais editais na busca atual; clicar filtra a lista. */
export function OndeMaisCompram({ municipios, termo, aoEscolher, carregando = false }: Props) {
  const maximo = Math.max(1, ...municipios.map((m) => m.qtd));
  return (
    <section aria-labelledby="onde-mais-compram" className="rounded-[22px] bg-raised px-6 py-[22px]">
      <div className="flex items-center gap-3.5">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-rio-soft text-rio">
          <IconeMapa className="size-[22px]" />
        </span>
        <h2 id="onde-mais-compram" className="text-[18px] font-semibold">Onde mais compram</h2>
      </div>
      {carregando ? (
        <p className="mt-4 text-sm text-ink-muted">Carregando…</p>
      ) : municipios.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Sem editais para essa busca.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-1">
          {municipios.map((m) => (
            <li key={m.ibge}>
              <button
                type="button"
                onClick={() => aoEscolher({ ibge: m.ibge, nome: m.nome, uf: m.uf })}
                className="flex min-h-11 w-full flex-col justify-center gap-1.5 rounded-sm text-left text-[14px] hover:text-pin-strong"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate">
                    {m.nome}/{m.uf}
                  </span>
                  <span className="font-mono font-medium">{numero(m.qtd)}</span>
                </span>
                <span className="h-2 w-full rounded-[4px] bg-sunken">
                  <span className="block h-2 rounded-[4px] bg-rio" style={{ width: `${Math.max(4, Math.round((m.qtd / maximo) * 100))}%` }} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-[13px] text-ink-muted">{termo.trim() ? `${termo.trim()} · abertos agora` : 'Todos os editais · abertos agora'}</p>
    </section>
  );
}
