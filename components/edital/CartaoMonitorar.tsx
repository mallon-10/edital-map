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
};

/** Ao lado da assessoria, logo abaixo do cartão principal: não é ajuda com este edital, é acompanhar os próximos. Para o Pro, sem venda. */
export function CartaoMonitorar({ href, segmento, preco }: Props) {
  const cartao = useAoVer<HTMLElement>(() => {
    if (preco) rastrear('pro_offer_viewed', { origem: 'edital', segmento });
  });
  return (
    <section ref={cartao} aria-labelledby="monitorar" className={`flex flex-col gap-3 rounded-[22px] p-5 lg:p-6 ${preco ? 'bg-ink text-surface' : 'bg-raised'}`}>
      <div className="flex flex-col gap-1">
        <h2 id="monitorar" className="text-balance text-[20px] font-bold leading-tight">Quer encontrar outras licitações como esta?</h2>
        <p className={`text-pretty text-[15px] leading-snug ${preco ? 'text-[#c7d6d3]' : 'text-ink-muted'}`}>Receba novas oportunidades relacionadas ao seu segmento automaticamente.</p>
        {preco ? <p className="text-[15px] font-semibold">Pro: {preco}.</p> : null}
      </div>
      <ChamadaPro
        href={href}
        origem="edital"
        segmento={segmento}
        className={`mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-full px-3 py-2.5 text-center text-[15px] font-semibold leading-snug ${preco ? 'bg-pin text-on-pin' : 'border border-line-strong bg-raised hover:bg-sunken'}`}
      >
        Monitorar oportunidades semelhantes
      </ChamadaPro>
    </section>
  );
}
