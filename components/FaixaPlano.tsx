'use client';

import Link from 'next/link';
import { useEffect, type ComponentType } from 'react';
import { publicarInicial, publicarUso, usoAtual, useUso } from '@/lib/cliente/uso';
import {
  bolinhas, LIMITE_GRATIS, leituraFaixa, textoFaixa, tomSelo, type TipoUso, type TomSelo, type UsoHoje,
} from '@/lib/limites';
import { IconeDocumento, Lupa, SetaDireita } from './inicio/Icones';

const FAIXA: Record<TomSelo, string> = {
  normal: 'border-pin/30 bg-pin-soft text-pin-strong',
  atencao: 'border-ouro/60 bg-ouro-soft text-ouro-strong',
  esgotado: 'border-pin-strong/40 bg-pin text-on-pin',
};

/** Cor das bolinhas: cheia = ainda disponível, vazia (só o contorno) = já usada hoje. */
const PONTO: Record<TomSelo, string> = {
  normal: 'text-pin-strong',
  atencao: 'text-ouro-strong',
  esgotado: 'text-ink',
};

/** Etiqueta "Plano grátis" do computador, em cor cheia para chamar o olho. */
const ETIQUETA: Record<TomSelo, string> = {
  normal: 'bg-pin text-on-pin',
  atencao: 'bg-ouro text-ink',
  esgotado: 'bg-ink text-raised',
};

const CONTADOR: { tipo: TipoUso; rotulo: string; Icone: ComponentType<{ className?: string }> }[] = [
  { tipo: 'busca', rotulo: 'Buscas', Icone: Lupa },
  { tipo: 'edital', rotulo: 'Editais', Icone: IconeDocumento },
];

const usadosDe = (uso: UsoHoje, tipo: TipoUso) => (tipo === 'busca' ? uso.buscas : uso.editais);

function Bolinhas({ usados, maximo, tom }: { usados: number; maximo: number; tom: TomSelo }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-1 ${PONTO[tom]}`}>
      {bolinhas(usados, maximo).map((cheia, i) => (
        <span
          key={i}
          className={`size-2.5 rounded-full border-2 border-current lg:size-3 ${cheia ? 'bg-current' : 'bg-transparent'}`}
        />
      ))}
    </span>
  );
}

/**
 * Faixa logo abaixo do cabeçalho com o que resta do plano grátis hoje, em bolinhas (cheia = disponível).
 * Computador: "PLANO GRÁTIS · Buscas ●●○ 2 de 3 · Editais ●○○ 1 de 3 · Ver planos →".
 * Celular: "Grátis hoje: [lupa] ●●○ [documento] ●○○ →", a linha toda leva aos Planos.
 * Tom: marca (laranja claro), amarelo quando falta 1 de qualquer um, laranja forte quando um zerou.
 * `inicial` vem do servidor (página inicial e edital); sem ele, pergunta a /api/uso. Navegador interno ou uso
 * desconhecido: sem faixa.
 */
export function FaixaPlano({ inicial }: { inicial?: UsoHoje | null }) {
  const daLoja = useUso();
  useEffect(() => {
    const precisaBuscar = inicial ? publicarInicial(inicial) : usoAtual() === null;
    if (!precisaBuscar) return;
    let cancelado = false;
    fetch('/api/uso', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<UsoHoje>) : null))
      .then((u) => {
        if (u && !cancelado) publicarUso(u);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [inicial]);
  const uso = daLoja ?? inicial ?? null;
  // Pro (e o valor antigo 'basic'): sem faixa, é uso justo.
  if (!uso || uso.interno || uso.plano === 'pro' || uso.plano === 'basic') return null;
  const tom = tomSelo(uso);
  const zerados = CONTADOR.filter((c) => usadosDe(uso, c.tipo) >= LIMITE_GRATIS[c.tipo]).length;
  return (
    <aside
      aria-label="Plano grátis"
      title="Limites do plano grátis por dia (zeram à 0h, horário de Brasília)"
      className={`shrink-0 border-b ${FAIXA[tom]}`}
    >
      <p aria-live="polite" className="sr-only">
        Plano grátis: {CONTADOR.map((c) => leituraFaixa(c.tipo, usadosDe(uso, c.tipo))).join('; ')}. Renova à 0h, horário de Brasília.
      </p>

      {/* Computador */}
      <div className="hidden h-11 items-center gap-7 px-6 text-sm lg:flex">
        <span aria-hidden="true" className={`rounded-xs px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.1em] ${ETIQUETA[tom]}`}>
          Plano grátis
        </span>
        {CONTADOR.map(({ tipo, rotulo }) => (
          <span key={tipo} aria-hidden="true" className="inline-flex items-center gap-2">
            <span className="font-semibold">{rotulo}</span>
            <Bolinhas usados={usadosDe(uso, tipo)} maximo={LIMITE_GRATIS[tipo]} tom={tom} />
            <span className="font-bold tabular-nums">{textoFaixa(tipo, usadosDe(uso, tipo))}</span>
          </span>
        ))}
        <span aria-hidden="true" className="text-[13px]">
          Renova à 0h
        </span>
        <Link
          href="/planos"
          className="ml-auto inline-flex h-11 items-center gap-1.5 font-bold underline-offset-4 hover:underline"
        >
          Ver planos <SetaDireita className="size-4" />
        </Link>
      </div>

      {/* Celular: a linha inteira é o toque para os Planos (44 px). */}
      <Link
        href="/planos"
        aria-label="Ver planos"
        className="flex min-h-11 items-center gap-2.5 pl-[calc(12px+env(safe-area-inset-left))] pr-[calc(4px+env(safe-area-inset-right))] text-[13px] lg:hidden"
      >
        {zerados < 2 ? <span className="whitespace-nowrap font-bold max-[359px]:hidden">Grátis hoje:</span> : null}
        {CONTADOR.map(({ tipo, Icone }) => {
          const usados = usadosDe(uso, tipo);
          return (
            <span key={tipo} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Icone className="size-4" />
              {usados >= LIMITE_GRATIS[tipo] ? (
                <span className="font-semibold">{textoFaixa(tipo, usados)}</span>
              ) : (
                <Bolinhas usados={usados} maximo={LIMITE_GRATIS[tipo]} tom={tom} />
              )}
            </span>
          );
        })}
        <span className="ml-auto inline-flex size-11 items-center justify-center">
          <SetaDireita className="size-5" />
        </span>
      </Link>
    </aside>
  );
}
