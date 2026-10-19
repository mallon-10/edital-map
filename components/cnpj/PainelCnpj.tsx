'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { RespostaCnpj } from '@/lib/cliente/cnpj';
import { buscaDoCnpj } from '@/lib/cnpj';
import { ASSUNTOS } from '@/lib/seo/assuntos';

type Props = {
  r: RespostaCnpj;
  /** Página inicial: aplica a busca ali mesmo. Sem isto (página /cnpj), o botão é um link para a busca. */
  aoVer?: (q: string, uf: string) => void;
};

/**
 * Empresa do CNPJ e os segmentos: os da atividade principal vêm marcados; fora dos segmentos, todos aparecem para marcar.
 * "Ver editais" busca pelos termos dos marcados na UF da sede.
 */
export function PainelCnpj({ r, aoVer }: Props) {
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(r.assuntos.filter((a) => a.principal).map((a) => a.slug)));
  const opcoes = r.assuntos.length ? r.assuntos : ASSUNTOS.map((a) => ({ slug: a.slug, nome: a.nome, principal: false }));
  const escolhidos = ASSUNTOS.filter((a) => marcados.has(a.slug));
  const q = escolhidos.map((a) => a.termo).join(', ');
  const uf = r.empresa.uf ?? '';
  const local = r.empresa.municipio && r.empresa.uf ? `${r.empresa.municipio}/${r.empresa.uf}` : r.empresa.uf;
  const rotulo = `Ver editais ${uf ? `em ${uf}` : 'no Brasil'}`;
  const desligado = marcados.size === 0;
  const botao = 'inline-flex h-11 items-center self-start rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin disabled:opacity-50';
  return (
    <section role="status" className="flex flex-col gap-2 rounded-md bg-sunken p-4">
      <span className="text-[15px] font-bold">{r.empresa.fantasia ?? r.empresa.razao}</span>
      <span className="text-[13px] text-ink-muted">
        {[r.empresa.atividade, local, r.empresa.ativa ? null : 'situação diferente de ativa'].filter(Boolean).join(' · ')}
      </span>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-[14px]">
          {r.assuntos.length
            ? 'Segmentos encontrados (marque os que sua empresa vende):'
            : 'A atividade registrada não é um dos segmentos que acompanhamos. Marque o que sua empresa vende:'}
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {opcoes.map((a) => (
            <label key={a.slug} className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={marcados.has(a.slug)}
                onChange={(e) => {
                  const n = new Set(marcados);
                  if (e.target.checked) n.add(a.slug);
                  else n.delete(a.slug);
                  setMarcados(n);
                }}
                className="size-4 accent-pin"
              />
              <span>
                {a.nome.replace(/^./, (c) => c.toUpperCase())}
                {a.principal ? <span className="text-ink-muted"> · atividade principal</span> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {aoVer ? (
        <button type="button" disabled={desligado} onClick={() => aoVer(q, uf)} className={botao}>
          {rotulo}
        </button>
      ) : (
        <Link
          href={buscaDoCnpj(escolhidos, r.empresa.uf)}
          prefetch={false}
          aria-disabled={desligado}
          className={`${botao} ${desligado ? 'pointer-events-none opacity-50' : ''}`}
        >
          {rotulo}
        </Link>
      )}
    </section>
  );
}
