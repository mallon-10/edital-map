import Link from 'next/link';
import { ATALHOS, atalhoAtivo, hrefDoAtalho, type IconeAtalho } from '@/lib/inicio';
import { numero } from '@/lib/formato';
import { IconeBrilho, IconeCamisa, IconeCapacete, IconeChevron, IconeCruz, IconeMonitor, IconeTalheres } from './Icones';

const ICONES: Record<IconeAtalho, (p: { className?: string }) => React.ReactNode> = {
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
};

/**
 * Atalhos de assunto da página inicial (lib/inicio.ts): um toque busca o assunto, mantendo a UF. O da busca atual fica
 * marcado. Celular: a fila rola para o lado; computador: seis colunas. Os links contam como busca (a página abre com ela).
 */
export function Atalhos({ totais, q, uf }: Props) {
  const ativo = atalhoAtivo(q);
  return (
    <section aria-labelledby="atalhos-titulo" className="flex flex-col gap-3 lg:gap-4">
      <div className="flex items-center justify-between gap-4 px-1">
        <h2 id="atalhos-titulo" className="text-[17px] font-medium text-ink-muted lg:text-[20px]">
          Assuntos
        </h2>
        <Link href="/licitacoes" className="inline-flex h-11 items-center gap-1 text-[16px] font-medium hover:text-pin-strong lg:text-[18px]">
          Todos os assuntos
          <IconeChevron className="size-5" />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible lg:px-0">
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
      </ul>
    </section>
  );
}
