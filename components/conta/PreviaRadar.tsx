'use client';

import { useEffect, useState } from 'react';
import { lerUltimaBusca } from '@/lib/cliente/volta';
import { EXEMPLOS_RADAR, STATUS_RADAR } from '@/lib/bloqueioPro';
import { moeda, prazo } from '@/lib/formato';
import { segmentoDaBusca } from '@/lib/rastreio';
import { assunto } from '@/lib/texto';
import type { ResultadoBusca } from '@/lib/tipos';

type Item = { id: string; titulo: string; local: string; prazo: string; valor: string };

const QUANTOS = 3;

/** prazo() responde "16 dias" quando falta bastante: sozinho, no cartão, não diz de quê. */
const textoDoPrazo = (t: string) => (/^\d/.test(t) ? `Encerra em ${t}` : t);

/** Parâmetros de /api/busca a partir do endereço da última busca, só se ela teve termo. */
function parametrosDaUltimaBusca(): { termo: string; parametros: URLSearchParams } | null {
  const p = new URLSearchParams(lerUltimaBusca().split('?')[1] ?? '');
  const termo = segmentoDaBusca(p.get('q'));
  if (!termo) return null;
  const municipio = p.get('municipio');
  if (municipio) {
    p.set('ibge', municipio);
    p.delete('municipio');
  }
  return { termo, parametros: p };
}

/** Demonstração do Meu Radar: editais reais da última busca do visitante ou, sem busca, exemplos. A legenda diz qual é. */
export function PreviaRadar() {
  const [real, setReal] = useState<{ termo: string; itens: Item[] } | null>(null);

  useEffect(() => {
    const busca = parametrosDaUltimaBusca();
    if (!busca) return;
    let cancelado = false;
    fetch(`/api/busca?${busca.parametros}`)
      .then((r) => (r.ok ? (r.json() as Promise<ResultadoBusca>) : null))
      .then((r) => {
        if (cancelado || !r?.editais.length) return;
        const agora = new Date();
        const itens = r.editais.slice(0, QUANTOS).map((e) => ({
          id: e.id,
          titulo: assunto(e.objeto).titulo,
          local: `${e.municipio_nome ?? '—'}/${e.uf}`,
          prazo: textoDoPrazo(prazo(e.encerramento_em, agora).texto),
          valor: moeda(e.valor_estimado) ?? 'Valor não informado',
        }));
        setReal({ termo: busca.termo, itens });
      })
      // Fora do ar: a demonstração continua com os exemplos.
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, []);

  const itens: readonly Item[] = real?.itens ?? EXEMPLOS_RADAR;
  return (
    <figure aria-label="Demonstração do Meu Radar" className="m-0 flex flex-col gap-2.5 rounded-[20px] bg-surface p-3 lg:flex-[1_1_50%] lg:rounded-[22px] lg:p-5">
      <span className="self-start rounded-full bg-ink px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-surface">Demonstração</span>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {itens.map((e, i) => (
          <li key={e.id} className="flex flex-col gap-1 rounded-2xl bg-raised p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-[15px] font-bold leading-snug">{e.titulo}</p>
              <span className="shrink-0 rounded-full bg-mata-soft px-2.5 py-0.5 text-[12px] font-semibold text-mata">{STATUS_RADAR[i % STATUS_RADAR.length]}</span>
            </div>
            <p className="text-[13px] text-ink-muted">{e.local}</p>
            <p className="flex flex-wrap justify-between gap-x-3 text-[13.5px]">
              <span className="font-semibold text-pin-strong">{e.prazo}</span>
              <span className="font-mono font-semibold">{e.valor}</span>
            </p>
          </li>
        ))}
      </ul>
      <figcaption className="text-[12.5px] text-ink-muted">
        {real
          ? `Demonstração com resultados reais da sua busca por "${real.termo}". Os status são só um exemplo.`
          : 'Demonstração com exemplos ilustrativos. No Meu Radar, os editais vêm do PNCP e seguem o perfil da sua empresa.'}
      </figcaption>
    </figure>
  );
}
