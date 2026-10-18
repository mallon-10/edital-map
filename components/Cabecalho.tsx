'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUso } from '@/lib/cliente/uso';
import type { UsoHoje } from '@/lib/limites';
import { Logo } from './Logo';
import { FaixaPlano } from './FaixaPlano';
import { MenuConta } from './conta/MenuConta';

const ABA = 'rounded-sm px-3 py-1.5 text-sm font-semibold';

type Props = {
  /** Uso do dia calculado no servidor (página inicial e edital). Sem ele, a faixa do plano grátis pergunta a /api/uso. */
  uso?: UsoHoje | null;
};

/**
 * Computador: logo, abas (Mapa, Meu Radar, Alertas, Planos), Sobre, conta e "Assinar Pro". Celular: logo, conta e "Assinar" (Mapa, Lista,
 * Alertas e Planos ficam na barra de baixo). Logo abaixo, a faixa do plano grátis (some no navegador interno).
 */
export function Cabecalho({ uso }: Props) {
  const caminho = usePathname() ?? '/';
  // Plano pago (não o dono): "Minha assinatura" no lugar de "Assinar Pro". A loja do uso tem o mais novo.
  const u = useUso() ?? uso ?? null;
  const pago = !u?.interno && (u?.plano === 'basic' || u?.plano === 'pro');
  const ativa = (href: string) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(href + '/'));
  const estilo = (href: string) => `${ABA} ${ativa(href) ? 'bg-pin-soft text-pin-strong' : 'text-ink hover:bg-sunken'}`;
  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-raised px-3 py-3 lg:gap-8 lg:px-6">
        <Link href="/" aria-label="Edital Map, página inicial" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          <Link href="/" aria-current={ativa('/') ? 'page' : undefined} className={estilo('/')}>
            Mapa
          </Link>
          <Link href="/radar" prefetch={false} aria-current={ativa('/radar') ? 'page' : undefined} className={estilo('/radar')}>
            Meu Radar
          </Link>
          <Link href="/alertas" aria-current={ativa('/alertas') ? 'page' : undefined} className={estilo('/alertas')}>
            Alertas
          </Link>
          <Link href="/planos" aria-current={ativa('/planos') ? 'page' : undefined} className={estilo('/planos')}>
            Planos
          </Link>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2 lg:gap-3">
          <Link href="/sobre" className="hidden text-sm font-semibold text-ink-muted hover:text-ink lg:inline">
            Sobre
          </Link>
          <MenuConta />
          {pago ? (
            <Link
              href="/assinatura"
              className="inline-flex h-9 shrink-0 items-center rounded-sm border border-line-strong bg-raised px-2.5 text-[13px] font-semibold text-ink hover:bg-sunken lg:h-10 lg:px-4 lg:text-sm"
            >
              <span className="lg:hidden">Assinatura</span>
              <span className="hidden lg:inline">Minha assinatura</span>
            </Link>
          ) : (
            <Link
              href="/planos"
              className="inline-flex h-9 shrink-0 items-center rounded-sm bg-pin px-2.5 text-[13px] font-semibold text-on-pin lg:h-10 lg:px-4 lg:text-sm"
            >
              <span className="lg:hidden">Assinar</span>
              <span className="hidden lg:inline">Assinar Pro</span>
            </Link>
          )}
        </div>
      </header>
      <FaixaPlano inicial={uso} />
    </>
  );
}
