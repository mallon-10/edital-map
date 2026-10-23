import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/Cabecalho';
import { PaginaTermo } from '@/components/guias/PaginaTermo';
import { guiaPorSlug, TERMOS, termoPorSlug } from '@/conteudo';
import { semMarcacao } from '@/lib/guias/jsonld';
import { OPEN_GRAPH_BASE } from '@/lib/seo/site';

type Props = { params: Promise<{ termo: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return TERMOS.map((t) => ({ termo: t.slug }));
}

/** Descrição do Google: a definição sem links, cortada em 160. */
const descricao = (texto: string) => {
  const t = semMarcacao(texto);
  return t.length <= 160 ? t : `${t.slice(0, 159).replace(/\s+\S*$/, '')}…`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = termoPorSlug((await params).termo);
  if (!t) return { title: 'Página não encontrada' };
  const titulo = `${t.nome}: o que é em licitações`;
  const caminho = `/glossario/${t.slug}`;
  return {
    title: { absolute: `${titulo} · Edital Map` },
    description: descricao(t.definicao),
    alternates: { canonical: caminho },
    openGraph: { ...OPEN_GRAPH_BASE, title: titulo, description: descricao(t.definicao), url: caminho },
  };
}

export default async function TermoDoGlossario({ params }: Props) {
  const t = termoPorSlug((await params).termo);
  if (!t) notFound();
  const relacionados = t.relacionados.flatMap((s) => {
    const r = termoPorSlug(s);
    return r ? [{ slug: r.slug, nome: r.nome }] : [];
  });
  const g = t.guia ? guiaPorSlug(t.guia) : null;
  return (
    <>
      <Cabecalho />
      <PaginaTermo termo={t} relacionados={relacionados} guia={g ? { slug: g.slug, titulo: g.titulo } : null} />
    </>
  );
}
