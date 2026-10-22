import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { RotaLicitacoes } from '@/components/licitacoes/PaginaLicitacoes';
import { resolverSegmento } from '@/lib/seo/assuntos';
import type { Pagina } from '@/lib/seo/textos';
import { metadadosDaPagina } from '@/lib/servidor/licitacoes';

type Props = { params: Promise<{ x: string }> };

/** /licitacoes/epi (assunto no Brasil), /licitacoes/pregao-eletronico (modalidade no Brasil) ou /licitacoes/sp (tudo na UF). */
function pagina(x: string): Pagina | null {
  const s = resolverSegmento(x);
  if (!s) return null;
  if (s.tipo === 'assunto') return { assunto: s.assunto, uf: null };
  if (s.tipo === 'modalidade') return { assunto: null, modalidade: s.modalidade, uf: null };
  return { assunto: null, uf: s.uf };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = pagina((await params).x);
  return p ? metadadosDaPagina(p) : { title: 'Página não encontrada' };
}

export default async function LicitacoesSegmento({ params }: Props) {
  await connection();
  const p = pagina((await params).x);
  if (!p) notFound();
  return <RotaLicitacoes pagina={p} />;
}
