import 'server-only';
import type { Metadata } from 'next';
import { caminhoDaPagina, descricaoDaPagina, type Pagina, tituloSeoDaPagina, type Vizinho } from '../seo/textos';
import type { EditalResumo, FiltrosBusca } from '../tipos';
import { ATALHOS } from '../inicio';
import { escolherCidades, type CidadePagina } from '../seo/municipios';
import { ehPrefeitura, escolherOrgaos, nomeDoOrgao, type OrgaoPagina } from '../seo/orgaos';
import { OPEN_GRAPH_BASE } from '../seo/site';
import { comNovaTentativa } from '../seo/sitemap';
import { abertosPorModalidade, abertosPorUf, buscarEditais, municipiosAbertos, orgaosAbertosLista } from './consultas';

const BASE: FiltrosBusca = {
  q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: 'prazo', valorMin: null, modalidades: null, orgao: null, raio: null,
};

export type DadosDaPagina = {
  total: number | null;
  editais: EditalResumo[];
  porUf: Record<string, number> | null;
  /** Página da UF: as cidades com página no sitemap, mais editais primeiro. */
  cidades: CidadePagina[];
  /** Página da cidade: os órgãos que mais compram nela (página do órgão ou a busca por ele). */
  orgaosDaCidade: Vizinho[];
  /** Página do órgão: outros órgãos da UF; índice /licitacoes: os maiores do Brasil. */
  orgaos: Vizinho[];
};

/** Órgãos listados na página da cidade, nos vizinhos do órgão e no índice. */
const MAX_ORGAOS_CIDADE = 10;
const MAX_OUTROS_ORGAOS = 12;
const MAX_ORGAOS_INDICE = 30;

/** Espera máxima pela contagem dos atalhos: a página inicial não fica presa a ela (sem número, o atalho continua). */
const ESPERA_ATALHOS_MS = 1500;

/**
 * Editais abertos no Brasil de cada atalho da página inicial (lib/inicio.ts), pela mesma contagem das páginas de assunto
 * (abertosPorUf, cache de 5 min). Falhou ou demorou: null para aquele atalho.
 */
export async function totaisDosAtalhos(): Promise<Record<string, number | null>> {
  const limite = new Promise<null>((r) => setTimeout(() => r(null), ESPERA_ATALHOS_MS));
  const totais = await Promise.all(
    ATALHOS.map((a) =>
      Promise.race([
        abertosPorUf(a.termo).then((porUf) => Object.values(porUf).reduce((s, n) => s + n, 0)),
        limite,
      ]).catch(() => null),
    ),
  );
  return Object.fromEntries(ATALHOS.map((a, i) => [a.slug, totais[i]]));
}

/** Cidades com página (lib/seo/municipios.ts). Banco fora: nenhuma. */
export async function cidadesComPagina(): Promise<CidadePagina[]> {
  return escolherCidades(await municipiosAbertos().catch(() => []));
}

/** Órgãos com página (lib/seo/orgaos.ts). Banco fora: nenhum. */
export async function orgaosComPagina(): Promise<OrgaoPagina[]> {
  const [lista, cidades] = await Promise.all([orgaosAbertosLista().catch(() => []), cidadesComPagina()]);
  return escolherOrgaos(lista, cidades);
}

/**
 * Cidades e órgãos para o sitemap: com uma nova tentativa, e `completo` falso se alguma lista faltar. Nas outras páginas,
 * banco fora vira lista vazia; aqui isso iria para a CDN como se não houvesse páginas.
 */
export async function listasDoSitemap(): Promise<{ cidades: CidadePagina[]; orgaos: OrgaoPagina[]; completo: boolean }> {
  const municipios = await comNovaTentativa(municipiosAbertos);
  const lista = await comNovaTentativa(orgaosAbertosLista);
  const cidades = escolherCidades(municipios ?? []);
  return { cidades, orgaos: escolherOrgaos(lista ?? [], cidades), completo: municipios !== null && lista !== null };
}

const caminhoDoOrgao = (o: OrgaoPagina) => caminhoDaPagina({ assunto: null, uf: o.uf, orgao: o });
const vizinhoDoOrgao = (o: OrgaoPagina): Vizinho => ({ nome: o.nome, caminho: caminhoDoOrgao(o), total: o.total });

/** Órgãos da cidade (prefeitura inclusa), mais editais primeiro; com página, o link vai para ela, senão para a busca. */
async function orgaosDaCidade(ibge: string, nomeCidade: string, uf: string): Promise<Vizinho[]> {
  const [lista, comPagina] = await Promise.all([orgaosAbertosLista().catch(() => []), orgaosComPagina()]);
  const paginas = new Map(comPagina.map((o) => [o.cnpj, o]));
  return lista
    .filter((o) => o.codigo_ibge === ibge && o.nome.trim() !== '')
    .sort((a, b) => b.total - a.total || a.cnpj.localeCompare(b.cnpj))
    .slice(0, MAX_ORGAOS_CIDADE)
    .map((o) => {
      const pagina = paginas.get(o.cnpj);
      if (pagina) return vizinhoDoOrgao(pagina);
      const nome = ehPrefeitura(o.nome) ? `Prefeitura de ${nomeCidade}` : nomeDoOrgao(o.nome, nomeCidade, uf);
      return { nome, caminho: `/?orgao=${encodeURIComponent(o.cnpj)}`, total: o.total };
    });
}

/**
 * Os 20 primeiros e o total (sem contar uso: página para o Google); no assunto ou na modalidade sem UF, a contagem por
 * UF para os links. Banco fora: total null. Metadados e página pedem o mesmo: o cache das consultas responde a segunda.
 */
export async function dadosDaPagina(p: Pagina): Promise<DadosDaPagina> {
  // Com assunto, os que mais combinam primeiro (relevância); sem assunto, os que encerram antes.
  const f: FiltrosBusca = {
    ...BASE,
    q: p.assunto?.termo ?? null,
    uf: p.orgao ? null : p.uf,
    ibge: p.cidade?.ibge ?? null,
    modalidades: p.modalidade ? [p.modalidade.id] : null,
    orgao: p.orgao?.cnpj ?? null,
    ordem: p.assunto ? 'relevancia' : 'prazo',
  };
  const contagemPorUf = async (): Promise<Record<string, number> | null> => {
    if (p.uf) return null;
    if (p.assunto) return abertosPorUf(p.assunto.termo).catch(() => null);
    if (p.modalidade) return abertosPorModalidade().then((m) => m[p.modalidade!.id] ?? {}).catch(() => null);
    return null;
  };
  const [lista, porUf] = await Promise.all([
    buscarEditais(f).catch((e: unknown) => {
      console.error(`licitacoes ${caminhoDaPagina(p)}:`, e);
      return null;
    }),
    contagemPorUf(),
  ]);
  const ehUf = p.uf && !p.assunto && !p.modalidade && !p.cidade && !p.orgao;
  const ehBrasil = !p.uf && !p.assunto && !p.modalidade && !p.orgao;
  // Página da UF: as cidades dela no sitemap, mais editais primeiro (a página mostra as 30 primeiras e o resto recolhido).
  const cidades = ehUf
    ? (await cidadesComPagina()).filter((c) => c.uf === p.uf && c.noSitemap).sort((a, b) => b.total - a.total || a.slug.localeCompare(b.slug))
    : [];
  const daCidade = p.cidade && p.uf ? await orgaosDaCidade(p.cidade.ibge, p.cidade.nome, p.uf) : [];
  let orgaos: Vizinho[] = [];
  if (p.orgao) {
    const o = p.orgao;
    orgaos = (await orgaosComPagina()).filter((x) => x.uf === o.uf && x.noSitemap && x.cnpj !== o.cnpj).slice(0, MAX_OUTROS_ORGAOS).map(vizinhoDoOrgao);
  } else if (ehBrasil) {
    orgaos = (await orgaosComPagina()).filter((x) => x.noSitemap).slice(0, MAX_ORGAOS_INDICE).map(vizinhoDoOrgao);
  }
  return { total: lista ? lista.total : null, editais: lista?.editais ?? [], porUf, cidades, orgaosDaCidade: daCidade, orgaos };
}

export async function metadadosDaPagina(p: Pagina): Promise<Metadata> {
  const { total } = await dadosDaPagina(p);
  const titulo = tituloSeoDaPagina(p);
  const descricao = descricaoDaPagina(p, total ?? 0);
  return {
    title: { absolute: `${titulo} · Edital Map` },
    description: descricao,
    alternates: { canonical: caminhoDaPagina(p) },
    openGraph: { ...OPEN_GRAPH_BASE, title: titulo, description: descricao, url: caminhoDaPagina(p) },
    // Zero editais sai do índice; banco fora (null) não tira a página do índice por uma queda.
    robots: total === 0 ? { index: false, follow: true } : undefined,
  };
}
