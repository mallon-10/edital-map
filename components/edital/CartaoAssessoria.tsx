'use client';

import Link from 'next/link';
import { useAoVer } from '@/lib/cliente/aoVer';
import { rastrear } from '@/lib/cliente/rastrear';
import { PRECO_ASSESSORIA } from '@/lib/assessoria';

// Curtos para caber numa linha na coluna da direita (~290 px de texto).
const ITENS = ['Resumo em linguagem simples', 'Documentos exigidos', 'Próximos passos para participar'];

type Props = {
  /** Triagem (hrefAssessoria): com o edital no endereço, quando houver. */
  href: string;
  /** Slug do edital; sem ele, a oferta foi vista na página inicial. */
  edital?: string;
  id: string;
  titulo?: string;
  texto?: string;
  botao?: string;
  className?: string;
};

/** Botão verde do cartão do topo do edital: a assessoria visível sem rolar (o cartão grande fica mais abaixo). */
export function BotaoAssessoria({ href }: { href: string }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex min-h-12 items-center rounded-full bg-mata px-5 py-2.5 text-[15px] font-semibold leading-snug text-raised hover:brightness-110">
      Quero orientação para este edital
    </Link>
  );
}

/** Oferta da assessoria (serviço à parte do Pro): preço inicial e o que entrega; o botão abre a triagem, não o WhatsApp. */
export function CartaoAssessoria({
  href,
  edital,
  id,
  titulo = 'Quer participar desta licitação?',
  texto = 'Entenda as exigências, organize os documentos e saiba quais são os próximos passos.',
  botao = 'Quero orientação para este edital',
  className = '',
}: Props) {
  const cartao = useAoVer<HTMLElement>(() => rastrear('assessoria_offer_viewed', { origem: edital ? 'edital' : 'inicio', edital }));
  return (
    <section ref={cartao} aria-labelledby={id} className={`flex-col gap-4 rounded-[22px] bg-mata-soft p-5 lg:p-6 ${className}`}>
      <p className="inline-flex h-[26px] items-center self-start rounded-full bg-raised px-2.5 text-xs font-semibold text-mata">
        Assessoria Edital Map
      </p>
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-balance text-[20px] font-bold leading-tight">{titulo}</h2>
        <p className="text-pretty text-[15px] leading-relaxed text-ink-muted">{texto}</p>
        <p className="text-[15px] font-semibold">Assessoria a partir de {PRECO_ASSESSORIA}.</p>
      </div>
      <ul className="flex flex-col gap-2 text-[15px] leading-snug">
        {ITENS.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0 text-mata">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12 2.5 2.5 4.5-5" />
            </svg>
            <span className="min-w-0 text-pretty">{item}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        prefetch={false}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-mata px-5 py-2.5 text-center text-[15px] font-semibold leading-snug text-raised hover:brightness-110"
      >
        {botao}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
      <p className="text-pretty text-[13px] leading-relaxed text-ink-muted">Serviço pago e separado do Pro. Escopo e preço confirmados antes de contratar. Orientação, sem garantia de habilitação ou de vitória.</p>
    </section>
  );
}
