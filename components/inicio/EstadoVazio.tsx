'use client';

import { useEffect, useMemo, useState } from 'react';
import { paraParametros } from '@/lib/filtros';
import { numero } from '@/lib/formato';
import type { FiltrosTela } from '@/lib/tipos';
import { chaveVazio, descreverVazio, escolherSugestoes, limitarContagens, sugestoesVazio } from '@/lib/vazio';

type Props = { filtros: FiltrosTela; aoAplicar: (f: FiltrosTela) => void };

async function contar(f: FiltrosTela, signal: AbortSignal): Promise<number | null> {
  try {
    const r = await fetch(`/api/contagem?${paraParametros(f)}`, { signal });
    if (!r.ok) return null;
    const corpo = (await r.json()) as { total?: unknown };
    return typeof corpo.total === 'number' ? corpo.total : null;
  } catch {
    return null;
  }
}

/** Lista vazia: diz o que foi buscado e propõe outras buscas que trazem editais (com o número, por /api/contagem; no máximo 4 chamadas). */
export function EstadoVazio({ filtros, aoAplicar }: Props) {
  const chave = chaveVazio(filtros);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- só a mudança real dos filtros (a chave) refaz as contagens
  const candidatas = useMemo(() => limitarContagens(sugestoesVazio(filtros)), [chave]);
  const [totais, setTotais] = useState<Array<number | null> | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    setTotais(null);
    void Promise.all(candidatas.map((c) => contar(c.filtros, ctl.signal))).then((t) => {
      if (!ctl.signal.aborted) setTotais(t);
    });
    return () => ctl.abort();
  }, [candidatas]);
  const boas = totais ? escolherSugestoes(candidatas, totais) : [];
  return (
    <div className="flex flex-col gap-3 px-2 py-6">
      <p className="font-semibold">{descreverVazio(filtros)}</p>
      {totais === null && candidatas.length > 0 ? <p className="text-sm text-ink-muted">Procurando sugestões…</p> : null}
      {boas.length > 0 ? (
        <>
          <p className="text-sm text-ink-muted">Experimente:</p>
          <ul className="flex flex-col gap-2">
            {boas.map((s) => (
              <li key={s.rotulo}>
                <button
                  type="button"
                  onClick={() => aoAplicar(s.filtros)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border border-line-strong bg-raised px-3 text-left text-sm font-semibold hover:bg-sunken"
                >
                  <span>{s.rotulo}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-muted">
                    {numero(s.total)} {s.total === 1 ? 'edital' : 'editais'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : totais !== null ? (
        <p className="text-sm text-ink-muted">Tente outro termo ou tire um filtro.</p>
      ) : null}
    </div>
  );
}
