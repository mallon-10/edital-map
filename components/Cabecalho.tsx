import Link from 'next/link';
import { Logo } from './Logo';

/** No celular cabe numa linha só: logo à esquerda, links à direita (o logo já leva à página inicial, então "Mapa" some). */
export function Cabecalho() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-x-3 border-b border-line bg-raised px-4 py-3 md:justify-start md:gap-x-6 md:px-6">
      <Link href="/" aria-label="Edital Map, página inicial" className="shrink-0">
        <Logo />
      </Link>
      <nav aria-label="Principal" className="flex gap-0.5 whitespace-nowrap text-[13px] font-semibold md:gap-1 md:text-sm">
        <Link href="/" className="hidden rounded-sm px-3 py-2 hover:bg-sunken md:inline-block">Mapa</Link>
        <Link href="/alertas" className="rounded-sm px-1.5 py-2 hover:bg-sunken md:px-3">Criar alerta</Link>
        <Link href="/sobre" className="rounded-sm px-1.5 py-2 hover:bg-sunken md:px-3">Sobre</Link>
      </nav>
    </header>
  );
}
