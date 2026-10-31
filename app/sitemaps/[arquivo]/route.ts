import { GUIAS, TERMOS } from '@/conteudo';
import { ASSUNTOS } from '@/lib/seo/assuntos';
import { url } from '@/lib/seo/site';
import { comNovaTentativa, emLotes, loteDoArquivo, paginasDeModalidade, paginasFixas, POR_ARQUIVO, xmlUrls } from '@/lib/seo/sitemap';
import { caminhoDaPagina } from '@/lib/seo/textos';
import { abertosPorModalidade, abertosPorUf, editaisAbertosSitemap } from '@/lib/servidor/consultas';
import { cidadesComPagina, orgaosComPagina } from '@/lib/servidor/licitacoes';

type Contexto = { params: Promise<{ arquivo: string }> };

const CABECALHOS = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' };
/** Faltou contagem: serve o que tem, mas sem guardar, ou a CDN repetiria o arquivo incompleto por até 2 h. */
const CABECALHOS_INCOMPLETO = { ...CABECALHOS, 'Cache-Control': 'no-store' };
/** Contagens ao mesmo tempo no banco: todas juntas estouravam o tempo das consultas depois de cada deploy. */
const CONTAGENS_POR_VEZ = 4;

/**
 * Páginas do site e /licitacoes com editais abertos: assuntos, modalidades, cidades com 5+ (e capitais) e órgãos com 10+.
 * Contagem fora: a página entra só no índice /licitacoes.
 */
async function paginas(): Promise<{ urls: Array<{ url: string }>; completo: boolean }> {
  const [contagens, modalidades, cidades, orgaos] = await Promise.all([
    emLotes([null, ...ASSUNTOS], CONTAGENS_POR_VEZ, async (assunto) => ({ assunto, porUf: await comNovaTentativa(() => abertosPorUf(assunto?.termo ?? null)) })),
    comNovaTentativa(abertosPorModalidade),
    cidadesComPagina(),
    orgaosComPagina(),
  ]);
  const completo = modalidades !== null && contagens.every((c) => c.porUf !== null);
  if (!completo) console.error('sitemap paginas.xml: contagem faltando, arquivo sem cache');
  const porModalidade = modalidades ?? {};
  const caminhos = [
    '/', '/planos', '/assessoria', '/sobre', '/alertas', '/cnpj', '/guias', '/glossario',
    ...GUIAS.map((g) => `/guias/${g.slug}`),
    ...TERMOS.map((t) => `/glossario/${t.slug}`),
    ...paginasFixas(contagens.map((c) => ({ assunto: c.assunto, porUf: c.porUf ?? {} }))),
    ...paginasDeModalidade(porModalidade),
    ...cidades.filter((c) => c.noSitemap).map((c) => `/licitacoes/${c.uf.toLowerCase()}/${c.slug}`),
    ...orgaos.filter((o) => o.noSitemap).map((o) => caminhoDaPagina({ assunto: null, uf: o.uf, orgao: o })),
  ];
  return { urls: caminhos.map((c) => ({ url: url(c) })), completo };
}

export async function GET(_: Request, { params }: Contexto): Promise<Response> {
  const { arquivo } = await params;
  if (arquivo === 'paginas.xml') {
    const { urls, completo } = await paginas();
    return new Response(xmlUrls(urls), { headers: completo ? CABECALHOS : CABECALHOS_INCOMPLETO });
  }
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
