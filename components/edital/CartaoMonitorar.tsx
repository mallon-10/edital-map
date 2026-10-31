'use client';

import { ChamadaPro } from '@/components/ChamadaPro';
import { useAoVer } from '@/lib/cliente/aoVer';
import { rastrear } from '@/lib/cliente/rastrear';

type Props = {
  /** /alertas/novo com o assunto e a UF do edital (hrefMonitorarEdital). */
  href: string;
  segmento: string | null;
  /** Preço do Pro para quem ainda não assina; quem já é Pro vai direto ao formulário preenchido. */
  preco: string | null;
  id: string;
  className?: string;
};

/** Depois da assessoria, mais discreto: não é ajuda com este edital, é acompanhar os próximos. */
export function CartaoMonitorar({ href, segmento, preco, id, className = '' }: Props) {
  const cartao = useAoVer<HTMLElement>(() => {
    if (preco) rastrear('pro_offer_viewed', { origem: 'edital', segmento });
  });
  return (
    <section ref={cartao} aria-labelledby={id} className={`flex-col gap-3 rounded-[22px] bg-raised p-5 lg:p-6 ${className}`}>
      <h2 id={id} className="text-balance text-[18px] font-semibold leading-snug">Quer encontrar outras licitações como esta?</h2>
      <p className="text-pretty text-[15px] leading-relaxed text-ink-muted">
        Receba novas oportunidades relacionadas ao seu segmento automaticamente.{preco ? ` Pro: ${preco}.` : ''}
      </p>
      <ChamadaPro
        href={href}
        origem="edital"
        segmento={segmento}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line-strong bg-raised px-5 py-2.5 text-center text-[15px] font-semibold leading-snug hover:bg-sunken"
      >
        Monitorar oportunidades semelhantes
      </ChamadaPro>
    </section>
  );
}
