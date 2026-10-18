'use client';

import { useEffect, useId, useState } from 'react';
import { NOMES_UF } from '@/lib/estados';
import { UFS_ORDENADAS } from '@/lib/filtros';
import { LIMITES_RADAR, lerBuscaMunicipio, type Abrangencia, type RascunhoRadar } from '@/lib/radar';
import type { Cidade } from '@/lib/tipos';

type Props = { valor: Pick<RascunhoRadar, 'abrangencia' | 'ufs' | 'municipios'>; aoMudar: (p: Partial<RascunhoRadar>) => void };

const OPCOES: ReadonlyArray<{ id: Abrangencia; rotulo: string }> = [
  { id: 'brasil', rotulo: 'Todo o Brasil' },
  { id: 'estados', rotulo: 'Estados' },
  { id: 'municipios', rotulo: 'Municípios' },
];
const ESCOLHA = 'inline-flex h-11 cursor-pointer items-center rounded-sm border px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rio';

/** Onde a empresa atende: Todo o Brasil (padrão), estados ou municípios (busca pelo nome em /api/municipios). */
export function CampoLocal({ valor, aoMudar }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Área de atendimento</legend>
        <div className="flex flex-wrap gap-2">
          {OPCOES.map((o) => (
            <label key={o.id} className={`${ESCOLHA} ${valor.abrangencia === o.id ? 'border-pin bg-pin-soft text-pin-strong' : 'border-line-strong bg-raised hover:bg-sunken'}`}>
              <input type="radio" name="abrangencia" value={o.id} checked={valor.abrangencia === o.id} onChange={() => aoMudar({ abrangencia: o.id })} className="sr-only" />
              {o.rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      {valor.abrangencia === 'estados' ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Estados</legend>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
            {UFS_ORDENADAS.map((uf) => {
              const marcado = valor.ufs.includes(uf);
              return (
                <button
                  key={uf}
                  type="button"
                  aria-pressed={marcado}
                  aria-label={NOMES_UF[uf]}
                  title={NOMES_UF[uf]}
                  onClick={() => aoMudar({ ufs: marcado ? valor.ufs.filter((u) => u !== uf) : [...valor.ufs, uf].sort() })}
                  className={`h-11 rounded-sm border font-mono text-sm font-semibold ${marcado ? 'border-pin bg-pin-soft text-pin-strong' : 'border-line-strong bg-raised hover:bg-sunken'}`}
                >
                  {uf}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {valor.abrangencia === 'municipios' ? <BuscaMunicipios escolhidos={valor.municipios} aoMudar={(municipios) => aoMudar({ municipios })} /> : null}
    </div>
  );
}

type Estado = 'buscando' | 'pronto' | 'erro';

function BuscaMunicipios({ escolhidos, aoMudar }: { escolhidos: Cidade[]; aoMudar: (c: Cidade[]) => void }) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<{ q: string; estado: Estado; cidades: Cidade[] } | null>(null);
  const cheio = escolhidos.length >= LIMITES_RADAR.municipios;
  // Mesma limpeza do servidor: texto que não serve não vai à rede (e a tela não mostra resultado velho).
  const q = lerBuscaMunicipio(texto);

  useEffect(() => {
    if (!q) return;
    const controle = new AbortController();
    const espera = window.setTimeout(async () => {
      setResultado({ q, estado: 'buscando', cidades: [] });
      try {
        const r = await fetch(`/api/municipios?q=${encodeURIComponent(q)}`, { signal: controle.signal });
        if (!r.ok) throw new Error(String(r.status));
        setResultado({ q, estado: 'pronto', cidades: (await r.json()) as Cidade[] });
      } catch {
        if (!controle.signal.aborted) setResultado({ q, estado: 'erro', cidades: [] });
      }
    }, 250);
    return () => {
      controle.abort();
      window.clearTimeout(espera);
    };
  }, [q]);

  const atual = q && resultado?.q === q ? resultado : null;
  const livres = (atual?.cidades ?? []).filter((c) => !escolhidos.some((e) => e.ibge === c.ibge));
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        Municípios
      </label>
      <input
        id={id}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={cheio}
        placeholder={cheio ? `Limite de ${LIMITES_RADAR.municipios} atingido` : 'Digite o nome do município'}
        autoComplete="off"
        className="h-11 rounded-sm border border-line-strong bg-raised px-3 text-[15px] disabled:bg-sunken"
      />
      <p role="status" className="text-[13px] text-ink-muted empty:hidden">
        {atual?.estado === 'buscando'
          ? 'Buscando…'
          : atual?.estado === 'erro'
            ? 'Não foi possível buscar agora. Tente de novo.'
            : atual?.estado === 'pronto' && livres.length === 0
              ? 'Nenhum município encontrado.'
              : ''}
      </p>
      {livres.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-sm border border-line bg-raised" aria-label="Municípios encontrados">
          {livres.map((c) => (
            <li key={c.ibge}>
              <button
                type="button"
                onClick={() => {
                  aoMudar([...escolhidos, c]);
                  setTexto('');
                }}
                className="flex h-11 w-full items-center px-3 text-left text-sm hover:bg-sunken"
              >
                {c.nome}/{c.uf}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {escolhidos.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Municípios escolhidos">
          {escolhidos.map((c) => (
            <li key={c.ibge} className="inline-flex items-center gap-1 rounded-sm bg-pin-soft pl-3 text-sm font-semibold text-pin-strong">
              {c.nome}/{c.uf}
              <button
                type="button"
                onClick={() => aoMudar(escolhidos.filter((e) => e.ibge !== c.ibge))}
                aria-label={`Remover ${c.nome}/${c.uf}`}
                className="inline-flex size-11 items-center justify-center rounded-xs text-lg leading-none hover:bg-raised"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
