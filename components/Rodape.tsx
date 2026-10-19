import Link from 'next/link';
import { LINKS_RODAPE } from '@/lib/seo/marca';

/** Rodapé de todas as páginas: marca, fonte dos dados e links fixos. */
export function Rodape() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-6 text-[13px] text-ink-muted md:flex-row md:items-center md:justify-between md:px-6">
        <p>
          <span className="font-semibold text-ink">Edital Map</span> · licitações abertas do PNCP no mapa, atualizadas a cada 3 horas
        </p>
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LINKS_RODAPE.map((l) => (
              <li key={l.caminho}>
                <Link href={l.caminho} prefetch={false} className="hover:text-ink hover:underline">
                  {l.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
