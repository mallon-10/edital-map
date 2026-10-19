import 'server-only';
import type { Metadata } from 'next';
import { caminhoDaPagina, descricaoDaPagina, type Pagina, tituloDaPagina } from '../seo/textos';
import type { EditalResumo, FiltrosBusca } from '../tipos';
import { escolherCidades, type CidadePagina } from '../seo/municipios';
import { OPEN_GRAPH_BASE } from '../seo/site';
import { abertosPorUf, buscarEditais, municipiosAbertos } from './consultas';

const BASE: FiltrosBusca = {
  q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: 'prazo', valorMin: null, modalidades: null, orgao: null, raio: null,
};

export type DadosDaPagina = { total: number | null; editais: EditalResumo[]; porUf: Record<string, number> | null; cidades: CidadePagina[] };

/** Cidades com página (lib/seo/municipios.ts). Banco fora: nenhuma. */
export async function cidadesComPagina(): Promise<CidadePagina[]> {
  return escolherCidades(await municipiosAbertos().catch(() => []));
}

/**
 * Os 20 primeiros e o total (sem contar uso: página para o Google); no assunto sem UF, a contagem por UF para os
 * links. Banco fora: total null. Metadados e página pedem o mesmo: o cache de 5 min das consultas responde a segunda.
 */
export async function dadosDaPagina(p: Pagina): Promise<DadosDaPagina> {
  // Com assunto, os que mais combinam primeiro (relevância); sem assunto, os que encerram antes.
  const f: FiltrosBusca = { ...BASE, q: p.assunto?.termo ?? null, uf: p.uf, ibge: p.cidade?.ibge ?? null, ordem: p.assunto ? 'relevancia' : 'prazo' };
  const [lista, porUf] = await Promise.all([
    buscarEditais(f).catch((e: unknown) => {
      console.error(`licitacoes ${p.assunto?.slug ?? '-'}/${p.uf ?? '-'}:`, e);
      return null;
    }),
    p.assunto && !p.uf ? abertosPorUf(p.assunto.termo).catch(() => null) : Promise.resolve(null),
  ]);
  // Página da UF (sem assunto e sem cidade): as cidades dela com página, para os links.
  const cidades = p.uf && !p.assunto && !p.cidade ? (await cidadesComPagina()).filter((c) => c.uf === p.uf) : [];
  return { total: lista ? lista.total : null, editais: lista?.editais ?? [], porUf, cidades };
}

export async function metadadosDaPagina(p: Pagina): Promise<Metadata> {
  const { total } = await dadosDaPagina(p);
  const titulo = tituloDaPagina(p);
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
