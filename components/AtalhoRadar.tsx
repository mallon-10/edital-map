'use client';

import Link from 'next/link';
import { useConta } from '@/lib/cliente/conta';

/** Celular: card no topo da página inicial para quem tem conta (no computador, a aba "Meu Radar" do cabeçalho). */
export function AtalhoRadar() {
  const conta = useConta();
  if (conta.carregando || !conta.email) return null;
  return (
    <Link href="/radar" prefetch={false} className="mx-3 mt-3 flex h-12 items-center justify-between rounded-md border border-line bg-raised px-4 text-sm font-semibold lg:hidden">
      Ver meu radar
      <span aria-hidden="true">→</span>
    </Link>
  );
}
