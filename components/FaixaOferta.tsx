'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { rastrear } from '@/lib/cliente/rastrear';
import { useAoVer } from '@/lib/cliente/aoVer';
import { CHAVE_OFERTA_FECHADA, ofertaFechada } from '@/lib/inicio';
import { OFERTA } from '@/lib/planos';
import { IconeEmail, IconeFechar } from './inicio/Icones';

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
    <aside ref={cartao} aria-label="Alertas por e-mail" className={`flex items-start gap-3 rounded-[22px] bg-raised p-4 pr-2 lg:gap-5 lg:px-6 lg:py-5 ${className}`}>
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[15px] bg-surface lg:size-[60px] lg:rounded-[18px]">
        <IconeEmail className="size-[22px] text-pin-strong lg:size-[26px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold leading-snug lg:text-[19px]">{OFERTA.texto}</p>
        <p className="mt-1 text-[14px] text-ink-muted lg:text-[15px]">
          {OFERTA.apoio}{' '}
          <Link
            href={OFERTA.href}
            prefetch={false}
            onClick={() => rastrear('pro_cta_clicked', { origem: 'faixa' }, { soGa: true })}
            className="font-semibold text-pin-strong underline-offset-2 hover:underline"
          >
            {OFERTA.cta}
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={fechar}
        aria-label="Fechar a oferta"
        className="-mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-sunken"
      >
        <IconeFechar className="size-5" />
      </button>
    </aside>
  );
}
