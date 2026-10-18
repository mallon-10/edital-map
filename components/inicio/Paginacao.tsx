'use client';

import { itensPaginacao, totalPaginas } from '@/lib/paginacao';

const BOTAO = 'inline-flex h-11 min-w-11 items-center justify-center rounded-sm border px-2 font-mono text-sm font-semibold disabled:opacity-50';

type Props = { pagina: number; total: number; carregando: boolean; aoIr: (pagina: number) => void };

/** Paginação numerada da lista (mudar de página não conta como busca). Some com uma página só. */
export function Paginacao({ pagina, total, carregando, aoIr }: Props) {
  const n = totalPaginas(total);
  if (n <= 1) return null;
  return (
    <nav aria-label="Páginas da lista" className="flex shrink-0 flex-wrap items-center justify-center gap-1 py-3">
      <button type="button" onClick={() => aoIr(pagina - 1)} disabled={carregando || pagina <= 1} aria-label="Página anterior" className={`${BOTAO} border-line-strong bg-raised`}>
        ‹
      </button>
      {itensPaginacao(pagina, n).map((item, i) =>
        item === 'reticencias' ? (
          <span key={`r${i}`} aria-hidden="true" className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => (item === pagina ? undefined : aoIr(item))}
            disabled={carregando}
            aria-current={item === pagina ? 'page' : undefined}
            aria-label={`Página ${item}`}
            className={`${BOTAO} ${item === pagina ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-raised'}`}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" onClick={() => aoIr(pagina + 1)} disabled={carregando || pagina >= n} aria-label="Próxima página" className={`${BOTAO} border-line-strong bg-raised`}>
        ›
      </button>
    </nav>
  );
}
