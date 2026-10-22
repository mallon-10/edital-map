import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { RotaLicitacoes } from '@/components/licitacoes/PaginaLicitacoes';
import { assuntoPorSlug, ufPorSlug } from '@/lib/seo/assuntos';
import { modalidadePorSlug } from '@/lib/seo/modalidades';
import { cidadePorSlug } from '@/lib/seo/municipios';
import type { Pagina } from '@/lib/seo/textos';
import { cidadesComPagina, metadadosDaPagina } from '@/lib/servidor/licitacoes';

type Props = { params: Promise<{ x: string; uf: string }> };

/**
 * /licitacoes/epi/sp (assunto na UF), /licitacoes/dispensa/sp (modalidade na UF) ou /licitacoes/sc/sao-bento-do-sul
 * (cidade com página, lib/seo/municipios.ts). /licitacoes/orgao/{slug} tem rota própria (app/licitacoes/orgao).
 */
async function pagina(x: string, segundo: string): Promise<Pagina | null> {
  const assunto = assuntoPorSlug(x);
  if (assunto) {
    const uf = ufPorSlug(segundo);
    return uf ? { assunto, uf } : null;
  }
  const modalidade = modalidadePorSlug(x);
  if (modalidade) {
    const uf = ufPorSlug(segundo);
    return uf ? { assunto: null, modalidade, uf } : null;
  }
  const uf = ufPorSlug(x);
  if (!uf) return null;
  const cidade = cidadePorSlug(await cidadesComPagina(), uf, segundo);
  return cidade ? { assunto: null, uf, cidade: { ibge: cidade.ibge, nome: cidade.nome, slug: cidade.slug } } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { x, uf } = await params;
  const p = await pagina(x, uf);
  return p ? metadadosDaPagina(p) : { title: 'Página não encontrada' };
}

export default async function LicitacoesSegundoNivel({ params }: Props) {
  await connection();
  const { x, uf } = await params;
  const p = await pagina(x, uf);
  if (!p) notFound();
  return <RotaLicitacoes pagina={p} />;
}
