'use client';

import { registrar } from '@/lib/cliente/registrar';

const VARIANTE = {
  /** Cabeçalho da página do edital: no celular some (o botão fica fixo embaixo, na variante `barra`). */
  cabecalho: 'hidden lg:inline-flex',
  /** Barra fixa do celular, na largura toda. */
  barra: 'flex w-full justify-center',
} as const;

type Props = { href: string; slug: string; variante?: keyof typeof VARIANTE };

export function BotaoEditalOficial({ href, slug, variante = 'cabecalho' }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrar('clicou_edital_oficial', { edital: slug })}
      onAuxClick={(e) => {
        if (e.button === 1) registrar('clicou_edital_oficial', { edital: slug });
      }}
      className={`${VARIANTE[variante]} h-11 items-center gap-2 rounded-sm bg-ink px-4 text-sm font-semibold text-surface hover:bg-[#1b3a63]`}
    >
      Abrir edital oficial
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}
