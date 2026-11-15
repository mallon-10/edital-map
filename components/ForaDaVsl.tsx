'use client';

import { usePathname } from 'next/navigation';
import { ehPaginaVsl } from '@/lib/cursoLicitacao';

/** Esconde o que vem dentro (o rodapé) na página de vendas em vídeo: lá a página é só o vídeo e o botão. */
export function ForaDaVsl({ children }: { children: React.ReactNode }) {
  return ehPaginaVsl(usePathname()) ? null : <>{children}</>;
}
