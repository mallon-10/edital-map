import { IconeGrafico } from './Icones';

/** Cartão da coluna lateral (computador): soma do valor estimado da busca e quantos editais entram nela. */
export function ValorEmJogo({ valor, total, carregando }: { valor: string | null; total: number; carregando: boolean }) {
  return (
    <section aria-labelledby="valor-em-jogo" className="flex flex-col gap-3.5 rounded-[22px] bg-raised px-6 py-[22px]">
      <div className="flex items-center gap-3.5">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-mata-soft text-mata">
          <IconeGrafico className="size-[22px]" />
        </span>
        <h2 id="valor-em-jogo" className="text-[18px] font-semibold">
          Valor em jogo
        </h2>
      </div>
      <p className="text-[15px] text-ink-muted">
        {carregando ? (
          'Carregando…'
        ) : valor ? (
          <>
            Soma do valor estimado: <span className="font-mono font-medium text-ink">{valor}</span> em {total === 1 ? '1 edital' : `${total.toLocaleString('pt-BR')} editais`}
          </>
        ) : (
          'Os órgãos não informaram o valor destes editais.'
        )}
      </p>
    </section>
  );
}
