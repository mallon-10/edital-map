'use client';

import { useEffect } from 'react';
import { publicarInicial, publicarUso, usoAtual, useUso } from '@/lib/cliente/uso';
import { textoSelo, textoSeloCompacto, tomSelo, type TomSelo, type UsoHoje } from '@/lib/limites';

const ESTILO: Record<TomSelo, string> = {
  normal: 'bg-sunken text-ink-muted',
  atencao: 'bg-ouro-soft text-ouro-strong',
  esgotado: 'bg-pin-soft text-pin-strong',
};

/**
 * "Grátis · restam 2 buscas e 1 edital hoje" (celular: "2 buscas · 1 edital"). Amarelo quando falta 1, laranja quando zerou.
 * `inicial` vem do servidor (página inicial e edital); sem ele, pergunta a /api/uso. Navegador interno: sem selo.
 */
export function SeloPlano({ inicial }: { inicial?: UsoHoje | null }) {
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
  if (!uso || uso.interno) return null;
  return (
    <span
      aria-live="polite"
      title="Limites do plano grátis por dia (zeram à 0h, horário de Brasília)"
      className={`inline-flex h-8 min-w-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold lg:px-3 lg:text-[13px] ${ESTILO[tomSelo(uso)]}`}
    >
      <span className="truncate lg:hidden">{textoSeloCompacto(uso)}</span>
      <span className="hidden lg:inline">{textoSelo(uso)}</span>
    </span>
  );
}
