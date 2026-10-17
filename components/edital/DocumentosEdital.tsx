'use client';

import { registrar } from '@/lib/cliente/registrar';
import type { ArquivoEdital } from '@/lib/tipos';

type Props = { arquivos: ArquivoEdital[] | null; slug: string };

/** Arquivos do edital no PNCP (edital e termo de referência primeiro), cada um com download direto. */
export function DocumentosEdital({ arquivos, slug }: Props) {
  if (arquivos === null) {
    return (
      <p className="text-ink-muted">
        Documentos indisponíveis agora. O PNCP não respondeu: veja no edital oficial ou tente de novo em alguns minutos.
      </p>
    );
  }
  if (arquivos.length === 0) return <p className="text-ink-muted">O órgão ainda não publicou documentos deste edital no PNCP.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {arquivos.map((a) => {
        const marcar = () => registrar('usou_recurso', { recurso: 'baixou_documento', edital: slug, documento: a.tipo });
        return (
          <li key={a.url}>
            <a
              href={a.url}
              download
              rel="noopener noreferrer"
              onClick={marcar}
              onAuxClick={(e) => {
                if (e.button === 1) marcar();
              }}
              className="flex items-center gap-3 py-2.5 hover:bg-sunken"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-semibold text-ink-muted">{a.tipo}</span>
                <span className="break-words text-[15px]">{a.titulo}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                </svg>
                Baixar
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
