import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { RotaLicitacoes } from '@/components/licitacoes/PaginaLicitacoes';
import { assuntoPorSlug, ufPorSlug } from '@/lib/seo/assuntos';
import type { Pagina } from '@/lib/seo/textos';
import { metadadosDaPagina } from '@/lib/servidor/licitacoes';

type Props = { params: Promise<{ x: string; uf: string }> };

/** /licitacoes/epi/sp: assunto na UF (aqui o primeiro segmento só vale como assunto). */
function pagina(x: string, ufSlug: string): Pagina | null {
  const assunto = assuntoPorSlug(x);
  const uf = ufPorSlug(ufSlug);
  return assunto && uf ? { assunto, uf } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { x, uf } = await params;
  const p = pagina(x, uf);
  return p ? metadadosDaPagina(p) : { title: 'Página não encontrada' };
}

export default async function LicitacoesAssuntoUf({ params }: Props) {
  await connection();
  const { x, uf } = await params;
  const p = pagina(x, uf);
  if (!p) notFound();
  return <RotaLicitacoes pagina={p} />;
}
