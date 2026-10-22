import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { connection } from 'next/server';
import { RotaLicitacoes } from '@/components/licitacoes/PaginaLicitacoes';
import { cnpjDoSlug, orgaoPorCnpj } from '@/lib/seo/orgaos';
import type { Pagina } from '@/lib/seo/textos';
import { metadadosDaPagina, orgaosComPagina } from '@/lib/servidor/licitacoes';

type Props = { params: Promise<{ slug: string }> };

/** /licitacoes/orgao/{nome}-{cnpj}: o CNPJ acha o órgão; o nome só enfeita o endereço (nome trocado = redirect). */
async function pagina(slug: string): Promise<{ pagina: Pagina; slugAtual: string } | null> {
  const cnpj = cnpjDoSlug(slug);
  if (!cnpj) return null;
  const o = orgaoPorCnpj(await orgaosComPagina(), cnpj);
  if (!o) return null;
  const { total: _t, noSitemap: _s, ...orgao } = o;
  return { pagina: { assunto: null, uf: o.uf, orgao }, slugAtual: o.slug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await pagina((await params).slug);
  return r ? metadadosDaPagina(r.pagina) : { title: 'Página não encontrada' };
}

export default async function LicitacoesOrgao({ params }: Props) {
  await connection();
  const { slug } = await params;
  const r = await pagina(slug);
  if (!r) notFound();
  if (r.slugAtual !== slug) permanentRedirect(`/licitacoes/orgao/${r.slugAtual}`);
  return <RotaLicitacoes pagina={r.pagina} />;
}
