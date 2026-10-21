'use client';

import Link from 'next/link';
import { use, type MouseEvent, type ReactNode } from 'react';
import { ATALHOS, atalhoAtivo, hrefDoAtalho, type IconeAtalho } from '@/lib/inicio';
import { numero } from '@/lib/formato';
import { IconeBrilho, IconeCamisa, IconeCapacete, IconeChevron, IconeCruz, IconeGrade, IconeMonitor, IconeTalheres } from './Icones';

const ICONES: Record<IconeAtalho, (p: { className?: string }) => ReactNode> = {
  camisa: IconeCamisa,
  capacete: IconeCapacete,
  brilho: IconeBrilho,
  monitor: IconeMonitor,
  talheres: IconeTalheres,
  cruz: IconeCruz,
};

type Props = {
  /** Editais abertos no Brasil por atalho (slug → total; null = sem número agora). */
  totais: Record<string, number | null>;
  q: string;
  uf: string;
  /** Clique comum: busca o assunto na própria página (sem recarregar). Ctrl/⌘, botão do meio: o link abre em outra aba. */
  aoEscolher: (termo: string) => void;
};

/**
 * Atalhos de assunto da página inicial (lib/inicio.ts): um toque busca o assunto, mantendo a UF. O da busca atual fica
 * marcado; por último, "Outros" leva a todos os assuntos (/licitacoes). Celular: a fila rola para o lado e encaixa com a
 * mesma margem da página (scroll-px-4); computador: sete colunas. O clique busca na própria página (conta como busca).
 */
export function Atalhos({ totais, q, uf, aoEscolher }: Props) {
  const ativo = atalhoAtivo(q);
  return (
    <section aria-labelledby="atalhos-titulo" className="flex flex-col gap-3 lg:gap-4">
      <div className="flex items-center justify-between gap-4 px-1">
        <h2 id="atalhos-titulo" className="text-[17px] font-medium text-ink-muted lg:text-[20px]">
          Assuntos
        </h2>
        <Link href="/licitacoes" prefetch={false} className="inline-flex h-11 items-center gap-1 text-[16px] font-medium hover:text-pin-strong lg:text-[18px]">
          Todos os assuntos
          <IconeChevron className="size-5" />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-3 lg:overflow-visible lg:px-0 xl:gap-4">
        {ATALHOS.map((a) => {
          const Icone = ICONES[a.icone];
          const marcado = a.slug === ativo;
          const total = totais[a.slug];
          return (
            <li key={a.slug} className="w-[136px] shrink-0 snap-start lg:w-auto">
              <Link
                href={hrefDoAtalho(a, uf)}
                prefetch={false}
                aria-current={marcado ? 'true' : undefined}
                onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  aoEscolher(a.termo);
                }}
                className={`flex h-full flex-col gap-3 rounded-[20px] bg-raised px-4 py-[18px] hover:shadow-[inset_0_0_0_1px_#847c6a] lg:gap-3.5 lg:rounded-[22px] lg:px-5 lg:py-[22px] ${
                  marcado ? 'shadow-[inset_0_0_0_2px_#0c2340]' : ''
                }`}
              >
                <Icone className={`size-[26px] lg:size-[30px] ${marcado ? 'text-pin-strong' : 'text-ink'}`} />
                <span>
                  <span className="block text-[17px] font-semibold lg:text-[19px]">{a.rotulo}</span>
                  <span className="block text-[14px] text-ink-muted lg:text-[15px]">
                    {typeof total === 'number' ? `${numero(total)} abertos` : 'Ver editais'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li className="w-[136px] shrink-0 snap-start lg:w-auto">
          <Link
            href="/licitacoes"
            prefetch={false}
            className="flex h-full flex-col gap-3 rounded-[20px] bg-raised px-4 py-[18px] hover:shadow-[inset_0_0_0_1px_#847c6a] lg:gap-3.5 lg:rounded-[22px] lg:px-5 lg:py-[22px]"
          >
            <IconeGrade className="size-[26px] text-ink lg:size-[30px]" />
            <span>
              <span className="block text-[17px] font-semibold lg:text-[19px]">Outros</span>
              <span className="block text-[14px] text-ink-muted lg:text-[15px]">Ver todos</span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** Atalhos com a contagem que o servidor manda depois do HTML (promessa; enquanto não chega, o Suspense mostra sem número). */
export function AtalhosComTotais({ promessa, ...resto }: Omit<Props, 'totais'> & { promessa: Promise<Record<string, number | null>> }) {
  return <Atalhos totais={use(promessa)} {...resto} />;
}
