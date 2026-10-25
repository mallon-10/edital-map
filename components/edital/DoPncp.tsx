'use client';

import { useEffect, useState } from 'react';
import { arquivosDoPncp } from '@/lib/pncp/arquivos';
import { itensDoPncp } from '@/lib/pncp/itens';
import type { ChaveCompra } from '@/worker/mapear';
import { DocumentosEdital } from './DocumentosEdital';
import { ListaItens } from './ListaItens';

const CARREGANDO = 'text-[15px] text-ink-muted';

/**
 * Lê do PNCP no navegador depois que a página abre. `undefined` = carregando; `null` = o PNCP não respondeu.
 * O servidor não chama mais o PNCP: da Vercel ele ficava sem resposta e segurava cada página 8 s.
 */
function usePncp<T>(chave: string, carregar: () => Promise<T>): T | null | undefined {
  const [estado, setEstado] = useState<{ chave: string; valor: T | null } | null>(null);
  useEffect(() => {
    let ativo = true;
    carregar().then(
      (valor) => ativo && setEstado({ chave, valor }),
      () => ativo && setEstado({ chave, valor: null }),
    );
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave resume o que `carregar` pede
  }, [chave]);
  return estado?.chave === chave ? estado.valor : undefined;
}

export function DocumentosDoPncp({ compra, slug }: { compra: ChaveCompra; slug: string }) {
  const arquivos = usePncp(`arquivos:${compra.id}`, () => arquivosDoPncp(compra));
  if (arquivos === undefined) return <p role="status" className={CARREGANDO}>Carregando os documentos do PNCP…</p>;
  return <DocumentosEdital arquivos={arquivos} slug={slug} />;
}

type PropsItens = { compra: ChaveCompra; slug: string; todos: boolean; totalResumo: number };

export function ItensDoPncp({ compra, slug, todos, totalResumo }: PropsItens) {
  const limite = todos ? 2000 : 50;
  const itens = usePncp(`itens:${compra.id}:${limite}`, () => itensDoPncp(compra, limite));
  if (itens === undefined) return <p role="status" className={CARREGANDO}>Carregando os itens do PNCP…</p>;
  // O total vem do resumo gravado pelo worker; sem resumo ainda, do que o PNCP devolveu agora.
  return <ListaItens itens={itens} total={Math.max(totalResumo, itens?.length ?? 0)} slug={slug} todos={todos} />;
}
