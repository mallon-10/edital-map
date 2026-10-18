'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { lerUltimaBusca } from '@/lib/cliente/volta';
import { comTela, type Tela } from '@/lib/urlBusca';
import { IconeEstrela, IconeLista, IconeMapa, IconeSino } from './inicio/Icones';

export type ItemBarra = 'mapa' | 'lista' | 'alertas' | 'planos';

const ITEM = 'flex h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold';
const ICONE = 'size-[22px]';

type Props = {
  ativo: ItemBarra | null;
  /** Só na página inicial: Mapa leva à vista Mapa (no topo); Lista, à vista Lista. */
  aoTrocarTela?: (t: Tela) => void;
};

/** Barra fixa do celular (abaixo de lg): Mapa · Lista · Alertas · Planos, com área de toque de 60 px e a área segura do iPhone. */
export function BarraCelular({ ativo, aoTrocarTela }: Props) {
  // Fora da página inicial, Mapa e Lista voltam para a última busca feita (guardada pela página inicial),
  // na vista Mapa ou na vista Lista (comTela).
  const [busca, setBusca] = useState('/');
  useEffect(() => setBusca(lerUltimaBusca()), []);
  const estilo = (i: ItemBarra) => `${ITEM} ${ativo === i ? 'text-pin-strong' : 'text-ink-muted'}`;
  const atual = (i: ItemBarra) => (ativo === i ? 'page' : undefined);

  function parteDaInicial(t: Tela, href: string, icone: ReactNode, rotulo: ReactNode) {
    return aoTrocarTela ? (
      <button type="button" onClick={() => aoTrocarTela(t)} aria-current={atual(t)} className={estilo(t)}>
        {icone}
        <span>{rotulo}</span>
      </button>
    ) : (
      // Sem pré-carregamento: abrir a página inicial com uma busca no endereço conta no limite do dia.
      <Link href={href} prefetch={false} aria-current={atual(t)} className={estilo(t)}>
        {icone}
        <span>{rotulo}</span>
      </Link>
    );
  }

  return (
    <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-raised pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden">
      {parteDaInicial('mapa', comTela(busca, 'mapa'), <IconeMapa className={ICONE} />, <>Mapa</>)}
      {parteDaInicial('lista', comTela(busca, 'lista'), <IconeLista className={ICONE} />, <>Lista</>)}
      <Link href="/alertas" aria-current={atual('alertas')} className={estilo('alertas')}>
        <IconeSino className={ICONE} />
        <span>Alertas</span>
      </Link>
      <Link href="/planos" aria-current={atual('planos')} className={estilo('planos')}>
        <IconeEstrela className={ICONE} />
        <span>Planos</span>
      </Link>
    </nav>
  );
}

/** Barra das páginas que não são a inicial (a inicial desenha a dela, que rola a própria página). */
export function BarraCelularGlobal() {
  const caminho = usePathname() ?? '/';
  if (caminho === '/') return null;
  const ativo: ItemBarra | null = caminho.startsWith('/alertas') ? 'alertas' : caminho.startsWith('/planos') ? 'planos' : null;
  return <BarraCelular ativo={ativo} />;
}
