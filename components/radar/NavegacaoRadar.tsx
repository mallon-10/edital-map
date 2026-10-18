'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Paginacao } from '@/components/inicio/Paginacao';
import { SeletorOrdem } from '@/components/inicio/SeletorOrdem';
import { urlDoRadar } from '@/lib/radar';
import type { Ordem } from '@/lib/tipos';

/** Ordenar o radar não conta busca (o radar é o perfil). Volta para a página 1. */
export function OrdemRadar({ ordem }: { ordem: Ordem }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  return <SeletorOrdem ordem={ordem} temTermo aoMudar={(o) => iniciar(() => router.push(urlDoRadar({ ordem: o, pagina: 1 })))} />;
}

/** Páginas de 20 (Basic, Pro e interno). */
export function PaginacaoRadar({ ordem, pagina, total }: { ordem: Ordem; pagina: number; total: number }) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  return (
    <Paginacao
      pagina={pagina}
      total={total}
      carregando={carregando}
      aoIr={(p) =>
        iniciar(() => {
          router.push(urlDoRadar({ ordem, pagina: p }));
          window.scrollTo({ top: 0 });
        })
      }
    />
  );
}
