'use client';

import { BotaoEmBreve } from '@/components/BotaoEmBreve';
import { MODALIDADES, UFS_COBERTAS, VALORES_MINIMOS } from '@/lib/filtros';
import { haQuanto, moedaCurta, numero } from '@/lib/formato';
import type { FiltrosTela, PontoMapa } from '@/lib/tipos';
import { Cadeado, Seta } from './Icones';
import { Popover } from './Popover';
import { chip } from './estilos';

type Props = { filtros: FiltrosTela; pontos: PontoMapa[]; atualizadoEm: string | null; agora: Date; aoMudar: (f: FiltrosTela) => void };

/** Chip com um select nativo por baixo (acessível e leve até com mil municípios). */
function ChipSelect({ rotulo, ativo, valor, aoMudar, children }: { rotulo: string; ativo: boolean; valor: string; aoMudar: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className={`${chip(ativo)} relative pr-8`}>
      <span>{rotulo}:</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)} className="max-w-[11rem] appearance-none truncate bg-transparent font-semibold">
        {children}
      </select>
      <Seta className="pointer-events-none absolute right-3 size-3.5" />
    </label>
  );
}

export function Chips({ filtros, pontos, atualizadoEm, agora, aoMudar }: Props) {
  const municipios = [...pontos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const qtdModalidades = filtros.modalidades.length;
  return (
    <div className="flex items-center gap-3">
      <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
        <ChipSelect rotulo="UF" ativo={Boolean(filtros.uf)} valor={filtros.uf} aoMudar={(uf) => aoMudar({ ...filtros, uf, cidade: null })}>
          <option value="">todas</option>
          {UFS_COBERTAS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </ChipSelect>
        <ChipSelect
          rotulo="Município"
          ativo={Boolean(filtros.cidade)}
          valor={filtros.cidade?.ibge ?? ''}
          aoMudar={(ibge) => {
            const p = pontos.find((x) => x.codigo_ibge === ibge);
            aoMudar({ ...filtros, cidade: p ? { ibge: p.codigo_ibge, nome: p.nome, uf: p.uf } : null });
          }}
        >
          <option value="">todos</option>
          {filtros.cidade && !pontos.some((p) => p.codigo_ibge === filtros.cidade?.ibge) ? (
            <option value={filtros.cidade.ibge}>
              {filtros.cidade.nome}/{filtros.cidade.uf}
            </option>
          ) : null}
          {municipios.map((p) => (
            <option key={p.codigo_ibge} value={p.codigo_ibge}>
              {p.nome}/{p.uf} ({numero(p.qtd)})
            </option>
          ))}
        </ChipSelect>
        <ChipSelect
          rotulo="Valor"
          ativo={filtros.valorMin !== null}
          valor={filtros.valorMin ? String(filtros.valorMin) : ''}
          aoMudar={(v) => aoMudar({ ...filtros, valorMin: v ? Number(v) : null })}
        >
          <option value="">qualquer</option>
          {VALORES_MINIMOS.map((v) => (
            <option key={v} value={v}>
              acima de {moedaCurta(v)}
            </option>
          ))}
        </ChipSelect>
        <Popover ativo={qtdModalidades > 0} rotulo={qtdModalidades ? `Modalidade · ${qtdModalidades}` : 'Modalidade'}>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-ink-muted">Modalidade</legend>
            {MODALIDADES.map((m) => {
              const marcada = filtros.modalidades.includes(m.id);
              return (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() =>
                      aoMudar({
                        ...filtros,
                        modalidades: marcada ? filtros.modalidades.filter((id) => id !== m.id) : [...filtros.modalidades, m.id],
                      })
                    }
                    className="size-4 accent-mata"
                  />
                  {m.nome}
                </label>
              );
            })}
          </fieldset>
        </Popover>
        <BotaoEmBreve recurso="filtros_pro" className={`${chip(false)} text-ink-muted`}>
          <Cadeado className="size-3.5" />
          Raio, órgão e recorrência · Pro
        </BotaoEmBreve>
      </div>
      <p className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted xl:block">
        Fonte: PNCP{atualizadoEm ? ` · atualizado ${haQuanto(atualizadoEm, agora)}` : ''}
      </p>
    </div>
  );
}
