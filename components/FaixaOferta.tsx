'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { rastrear } from '@/lib/cliente/rastrear';
import { useAoVer } from '@/lib/cliente/aoVer';
import { CHAVE_OFERTA_FECHADA, ofertaFechada } from '@/lib/inicio';
import { OFERTA } from '@/lib/planos';
import { IconeFechar } from './inicio/Icones';

/**
 * Cartão da oferta do Pro (receber as licitações certas por e-mail), para quem não é Pro. Na página inicial fica embaixo
 * do cartão do topo; nas outras, embaixo do cabeçalho. O X esconde o cartão por uns dias (lib/inicio.ts), só neste
 * navegador. Quem decide se aparece é `mostrarOferta` (lib/planos.ts).
 */
export function FaixaOferta({ className = '' }: { className?: string }) {
  const [fechada, setFechada] = useState(false);
  // Aparece em muitas páginas: conta só no GA4, sem uma linha no banco por página vista.
  const cartao = useAoVer<HTMLElement>(() => rastrear('pro_offer_viewed', { origem: 'faixa' }, { soGa: true }));
  useEffect(() => {
    try {
      if (ofertaFechada(localStorage.getItem(CHAVE_OFERTA_FECHADA), new Date())) setFechada(true);
    } catch {
      // sem armazenamento (janela privada, bloqueio): o cartão continua
    }
  }, []);
  if (fechada) return null;

  function fechar() {
    setFechada(true);
    try {
      localStorage.setItem(CHAVE_OFERTA_FECHADA, String(Date.now()));
    } catch {
      // fecha só agora
    }
  }

  return (
    <aside ref={cartao} aria-label="Alertas por e-mail" className={`relative flex flex-col gap-3 rounded-[22px] bg-ink p-5 text-surface lg:flex-row lg:items-center lg:gap-6 lg:py-5 lg:pl-7 lg:pr-14 ${className}`}>
      <div className="min-w-0 flex-1 pr-8 lg:pr-0">
        <p className="text-pretty text-[18px] font-bold leading-tight lg:text-[21px]">{OFERTA.texto}</p>
        <p className="mt-1 text-pretty text-[14.5px] leading-snug text-[#c7d6d3]">{OFERTA.apoio}</p>
      </div>
      <Link
        href={OFERTA.href}
        prefetch={false}
        onClick={() => rastrear('pro_cta_clicked', { origem: 'faixa' }, { soGa: true })}
        className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-pin px-6 text-[15px] font-semibold text-on-pin"
      >
        {OFERTA.cta}
      </Link>
      <button
        type="button"
        onClick={fechar}
        aria-label="Fechar a oferta"
        className="absolute right-1.5 top-1.5 flex size-11 items-center justify-center rounded-full text-[#c7d6d3] hover:bg-white/10 hover:text-surface"
      >
        <IconeFechar className="size-5" />
      </button>
    </aside>
  );
}
