'use client';

import Link from 'next/link';
import { useAoVer } from '@/lib/cliente/aoVer';
import { rastrear } from '@/lib/cliente/rastrear';
import { PRECO_ASSESSORIA } from '@/lib/assessoria';

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

/** Botão verde no cartão do topo, só no celular: ali as ofertas ficam fora da primeira tela. No computador elas aparecem logo abaixo. */
export function BotaoAssessoria({ href }: { href: string }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex min-h-12 items-center rounded-full bg-mata px-5 py-2.5 text-[15px] font-semibold leading-snug text-raised hover:brightness-110 lg:hidden">
      Quero orientação para este edital
    </Link>
  );
}

/** Oferta da assessoria (serviço à parte do Pro): o preço inicial e o botão, que abre a triagem, não o WhatsApp. */
export function CartaoAssessoria({
  href,
  edital,
  id,
  titulo = 'Quer participar desta licitação?',
  texto = 'Entenda as exigências, organize os documentos e saiba quais são os próximos passos.',
  botao = 'Quero orientação para este edital',
  className = 'flex',
}: Props) {
  const cartao = useAoVer<HTMLElement>(() => rastrear('assessoria_offer_viewed', { origem: edital ? 'edital' : 'inicio', edital }));
  return (
    <section ref={cartao} aria-labelledby={id} className={`flex-col gap-3 rounded-[22px] bg-mata-soft p-5 lg:p-6 ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-balance text-[20px] font-bold leading-tight">{titulo}</h2>
        <p className="text-pretty text-[15px] leading-snug text-ink-muted">{texto}</p>
        <p className="text-[15px] font-semibold">Assessoria a partir de {PRECO_ASSESSORIA}.</p>
      </div>
      <Link
        href={href}
        prefetch={false}
        className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-full bg-mata px-3 py-2.5 text-center text-[15px] font-semibold leading-snug text-raised hover:brightness-110"
      >
        {botao}
      </Link>
      <p className="text-pretty text-[13px] leading-snug text-ink-muted">Serviço à parte do Pro, com escopo e preço confirmados antes de contratar. Sem garantia de habilitação ou de vitória.</p>
    </section>
  );
}
