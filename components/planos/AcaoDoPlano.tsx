'use client';

import Link from 'next/link';
import type { Periodo, Plano } from '@/lib/planos';
import { BotaoQueroPlano } from './BotaoQueroPlano';

/**
 * Ação de cada plano na tabela e nos cartões: "Seu plano hoje" no plano atual; no Pro, com o pagamento ligado,
 * "Assinar o Pro" (checkout próprio em /assinar); desligado, a lista de espera de antes.
 */
export function AcaoDoPlano({ plano, periodo, pagamento, atual }: { plano: 'gratis' | 'pro'; periodo: Periodo; pagamento: boolean; atual: Plano }) {
  const meuPlano = plano === 'pro' ? atual !== 'gratis' : atual === 'gratis';
  if (meuPlano) return <span className="text-[12px] font-normal text-ink-muted">Seu plano hoje</span>;
  if (plano === 'gratis') return null;
  if (!pagamento) return <BotaoQueroPlano plano="pro" periodo={periodo} destaque />;
  return (
    <Link
      href={`/assinar?periodo=${periodo}`}
      prefetch={false}
      className="inline-flex h-11 items-center justify-center rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin"
    >
      Assinar o Pro
    </Link>
  );
}
