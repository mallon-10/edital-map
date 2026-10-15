'use client';

import { registrar } from '@/lib/cliente/registrar';

export function BotaoEditalOficial({ href, slug }: { href: string; slug: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrar('clicou_edital_oficial', { edital: slug })}
      className="inline-flex h-11 items-center gap-2 rounded-sm bg-ink px-4 text-sm font-semibold text-surface hover:bg-[#1b3a63]"
    >
      Abrir edital oficial
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}
