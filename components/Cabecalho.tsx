'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BotaoEmBreve } from './BotaoEmBreve';
import { Logo } from './Logo';

const ABA = 'rounded-sm px-3 py-1.5 text-sm font-semibold';

/** Logo, abas (Mapa, Alertas, Planos) e "Assinar Pro". No celular: logo, Alertas e Assinar Pro. */
export function Cabecalho() {
  const caminho = usePathname() ?? '/';
  const ativa = (href: string) => (href === '/' ? caminho === '/' : caminho.startsWith(href));
  const estilo = (href: string) => `${ABA} ${ativa(href) ? 'bg-pin-soft text-pin-strong' : 'text-ink hover:bg-sunken'}`;
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-raised px-4 py-3 lg:gap-8 lg:px-6">
      <Link href="/" aria-label="Edital Map, página inicial" className="shrink-0">
        <Logo />
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-1">
        <Link href="/" aria-current={ativa('/') ? 'page' : undefined} className={`${estilo('/')} hidden lg:inline-block`}>
          Mapa
        </Link>
        <Link href="/alertas" aria-current={ativa('/alertas') ? 'page' : undefined} className={estilo('/alertas')}>
          Alertas
        </Link>
        <BotaoEmBreve recurso="plano_pro" className={`${ABA} hidden text-ink hover:bg-sunken lg:inline-block`}>
          Planos
        </BotaoEmBreve>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/sobre" className="hidden text-sm font-semibold text-ink-muted hover:text-ink lg:inline">
          Sobre
        </Link>
        <BotaoEmBreve
          recurso="plano_pro"
          className="h-9 shrink-0 rounded-sm bg-pin px-3 text-[13px] font-semibold text-on-pin lg:h-10 lg:px-4 lg:text-sm"
        >
          Assinar Pro
        </BotaoEmBreve>
      </div>
    </header>
  );
}
