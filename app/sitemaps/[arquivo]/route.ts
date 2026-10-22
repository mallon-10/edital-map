import { ASSUNTOS } from '@/lib/seo/assuntos';
import { url } from '@/lib/seo/site';
import { loteDoArquivo, paginasDeModalidade, paginasFixas, POR_ARQUIVO, xmlUrls } from '@/lib/seo/sitemap';
import { caminhoDaPagina } from '@/lib/seo/textos';
import { abertosPorModalidade, abertosPorUf, editaisAbertosSitemap } from '@/lib/servidor/consultas';
import { cidadesComPagina, orgaosComPagina } from '@/lib/servidor/licitacoes';

type Contexto = { params: Promise<{ arquivo: string }> };

const CABECALHOS = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' };

/**
 * Páginas do site e /licitacoes com editais abertos: assuntos, modalidades, cidades com 5+ (e capitais) e órgãos com 10+.
 * Contagem fora: a página entra só no índice /licitacoes.
 */
async function paginas(): Promise<Array<{ url: string }>> {
  const [contagens, porModalidade, cidades, orgaos] = await Promise.all([
    Promise.all([null, ...ASSUNTOS].map(async (assunto) => ({ assunto, porUf: await abertosPorUf(assunto?.termo ?? null).catch(() => ({})) }))),
    abertosPorModalidade().catch(() => ({})),
    cidadesComPagina(),
    orgaosComPagina(),
  ]);
  const caminhos = [
    '/', '/planos', '/sobre', '/alertas', '/cnpj',
    ...paginasFixas(contagens),
    ...paginasDeModalidade(porModalidade),
    ...cidades.filter((c) => c.noSitemap).map((c) => `/licitacoes/${c.uf.toLowerCase()}/${c.slug}`),
    ...orgaos.filter((o) => o.noSitemap).map((o) => caminhoDaPagina({ assunto: null, uf: o.uf, orgao: o })),
  ];
  return caminhos.map((c) => ({ url: url(c) }));
}

export async function GET(_: Request, { params }: Contexto): Promise<Response> {
  const { arquivo } = await params;
  if (arquivo === 'paginas.xml') return new Response(xmlUrls(await paginas()), { headers: CABECALHOS });
  const lote = loteDoArquivo(arquivo);
  if (lote === null) return new Response('Não encontrado', { status: 404 });
  try {
    const editais = await editaisAbertosSitemap(POR_ARQUIVO, (lote - 1) * POR_ARQUIVO);
    const xml = xmlUrls(editais.map((e) => ({ url: url(`/edital/${e.slug}`), lastModified: new Date(e.atualizada_pncp_em).toISOString() })));
    return new Response(xml, { headers: CABECALHOS });
  } catch (erro) {
    console.error(`sitemap ${arquivo}:`, erro);
    // Sem cache: o robô tenta de novo mais tarde e não guarda um arquivo vazio.
    return new Response('Indisponível', { status: 503, headers: { 'Retry-After': '3600' } });
  }
}
