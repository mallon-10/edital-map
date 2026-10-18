'use client';

import Link from 'next/link';
import { registrar } from '@/lib/cliente/registrar';

/** Cadeado dos recursos Pro (raio, órgão, exportação) para quem não tem o plano: leva à tabela do Pro. */
export function LinkPro({ rotulo, className }: { rotulo: string; className: string }) {
  return (
    <Link
      href="/planos#pro"
      prefetch={false}
      onClick={() => registrar('quer_recurso', { recurso: 'filtros_pro' })}
      className={className}
      aria-label={`${rotulo}: recurso do plano Pro`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>{rotulo}</span>
      <span className="font-semibold opacity-70">· Pro</span>
    </Link>
  );
}
