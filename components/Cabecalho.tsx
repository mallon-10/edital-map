'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { planoConhecido, publicarPlano, usePlano } from '@/lib/cliente/plano';
import { mostrarOferta, type PlanoDaPagina } from '@/lib/planos';
import { Logo } from './Logo';
import { FaixaOferta } from './FaixaOferta';
import { MenuConta } from './conta/MenuConta';

const ABA = 'rounded-full px-4 py-2 text-sm font-semibold';

type Props = {
  /** Plano do visitante calculado no servidor (inicial, edital, licitações, planos, radar). Sem ele, pergunta a /api/plano uma vez. */
  plano?: PlanoDaPagina | null;
  /** A página mostra a oferta do Pro em outro lugar (a inicial: embaixo do cartão do topo). */
  semOferta?: boolean;
};

/**
 * Computador: logo, abas (Mapa, Meu Radar, Alertas, Planos), Sobre, conta e "Assinar Pro". Celular: logo, conta e "Assinar" (Mapa, Lista,
 * Alertas e Planos ficam na barra de baixo). Logo abaixo, o cartão da oferta (alertas por e-mail) para quem não é Pro nem o dono.
 */
export function Cabecalho({ plano, semOferta = false }: Props) {
  const caminho = usePathname() ?? '/';
  const daLoja = usePlano();
  useEffect(() => {
    if (plano) {
      publicarPlano(plano);
      return;
    }
    if (planoConhecido()) return;
    let cancelado = false;
    fetch('/api/plano', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PlanoDaPagina>) : null))
      .then((p) => {
        if (p && !cancelado) publicarPlano(p);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [plano]);
  // Plano pago (não o dono): "Minha assinatura" no lugar de "Assinar Pro". O do servidor vale primeiro.
  const p = plano ?? daLoja;
  const pago = Boolean(p && !p.dono && (p.plano === 'basic' || p.plano === 'pro'));
  const ativa = (href: string) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(href + '/'));
  const estilo = (href: string) => `${ABA} ${ativa(href) ? 'bg-raised text-ink shadow-[0_0_0_1px_#ddd6c6]' : 'text-ink hover:bg-raised'}`;
  return (
    <>
      <header className="flex shrink-0 items-center gap-2 bg-surface px-4 py-3 lg:gap-8 lg:px-6 lg:py-4">
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
              className="inline-flex h-10 shrink-0 items-center rounded-full border border-line-strong bg-raised px-3.5 text-[13px] font-semibold text-ink hover:bg-sunken lg:h-11 lg:px-5 lg:text-sm"
            >
              <span className="lg:hidden">Assinatura</span>
              <span className="hidden lg:inline">Minha assinatura</span>
            </Link>
          ) : (
            <Link
              href="/planos"
              className="inline-flex h-10 shrink-0 items-center rounded-full bg-pin px-3.5 text-[13px] font-semibold text-on-pin lg:h-11 lg:px-5 lg:text-sm"
            >
              <span className="lg:hidden">Assinar</span>
              <span className="hidden lg:inline">Assinar Pro</span>
            </Link>
          )}
        </div>
      </header>
      {!semOferta && mostrarOferta(p, caminho) ? (
        <div className="px-4 pb-1 lg:px-6">
          <FaixaOferta className="mx-auto max-w-[1200px]" />
        </div>
      ) : null}
    </>
  );
}
