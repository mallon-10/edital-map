import Link from 'next/link';
import { Logo } from './Logo';

export function Cabecalho() {
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-raised px-4 py-3 md:px-6">
      <Link href="/" aria-label="Edital Map, página inicial">
        <Logo />
      </Link>
      <nav aria-label="Principal" className="flex gap-1 text-sm font-semibold">
        <Link href="/" className="rounded-sm px-3 py-2 hover:bg-sunken">Mapa</Link>
        <Link href="/alertas" className="rounded-sm px-3 py-2 hover:bg-sunken">Criar alerta</Link>
        <Link href="/sobre" className="rounded-sm px-3 py-2 hover:bg-sunken">Sobre</Link>
      </nav>
    </header>
  );
}
