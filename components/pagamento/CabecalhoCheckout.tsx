import Link from 'next/link';
import { IconeCadeado } from '@/components/inicio/Icones';
import { Logo } from '@/components/Logo';

/** Cabeçalho do checkout: só o logo e "Pagamento seguro" (sem abas nem "Assinar Pro", nada tira a pessoa do pagamento). */
export function CabecalhoCheckout() {
  return (
    <header className="mx-auto flex w-full max-w-[1128px] items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-[18px]">
      <Link href="/" aria-label="Edital Map, página inicial" className="shrink-0">
        <Logo />
      </Link>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-mata lg:gap-2 lg:text-[14px]">
        <IconeCadeado className="size-4 lg:size-[18px]" />
        Pagamento seguro
      </p>
    </header>
  );
}
