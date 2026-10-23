import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/Cabecalho';
import { PaginaGuia } from '@/components/guias/PaginaGuia';
import { GUIAS, guiaPorSlug } from '@/conteudo';
import { nomeDoCaminho } from '@/lib/guias/validar';
import { OPEN_GRAPH_BASE } from '@/lib/seo/site';

type Props = { params: Promise<{ slug: string }> };

/** Guias estáticos: só os do conteúdo do repositório (conteudo/guias); outro endereço = 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guiaPorSlug((await params).slug);
  if (!g) return { title: 'Página não encontrada' };
  const caminho = `/guias/${g.slug}`;
  return {
    title: { absolute: `${g.titulo} · Edital Map` },
    description: g.descricao,
    alternates: { canonical: caminho },
    openGraph: { ...OPEN_GRAPH_BASE, type: 'article', title: g.titulo, description: g.descricao, url: caminho, modifiedTime: g.revisadoEm },
  };
}

export default async function Guia({ params }: Props) {
  const g = guiaPorSlug((await params).slug);
  if (!g) notFound();
  const nomes = Object.fromEntries(g.editais.map((c) => [c, nomeDoCaminho(c) ?? c]));
  const relacionados = g.relacionados.flatMap((s) => {
    const r = guiaPorSlug(s);
    return r ? [{ slug: r.slug, titulo: r.titulo, descricao: r.descricao }] : [];
  });
  return (
    <>
      <Cabecalho />
      <PaginaGuia guia={g} nomesDosEditais={nomes} relacionados={relacionados} />
    </>
  );
}
