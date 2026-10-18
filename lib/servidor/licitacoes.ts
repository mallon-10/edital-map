import 'server-only';
import type { Metadata } from 'next';
import { caminhoDaPagina, descricaoDaPagina, type Pagina, tituloDaPagina } from '../seo/textos';
import type { EditalResumo, FiltrosBusca } from '../tipos';
import { abertosPorUf, buscarEditais } from './consultas';

const BASE: FiltrosBusca = {
  q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: 'prazo', valorMin: null, modalidades: null, orgao: null, raio: null,
};

export type DadosDaPagina = { total: number | null; editais: EditalResumo[]; porUf: Record<string, number> | null };

/**
 * Os 20 primeiros e o total (sem contar uso: página para o Google); no assunto sem UF, a contagem por UF para os
 * links. Banco fora: total null. Metadados e página pedem o mesmo: o cache de 5 min das consultas responde a segunda.
 */
export async function dadosDaPagina(p: Pagina): Promise<DadosDaPagina> {
  // Com assunto, os que mais combinam primeiro (relevância); sem assunto, os que encerram antes.
  const f: FiltrosBusca = { ...BASE, q: p.assunto?.termo ?? null, uf: p.uf, ordem: p.assunto ? 'relevancia' : 'prazo' };
  const [lista, porUf] = await Promise.all([
    buscarEditais(f).catch((e: unknown) => {
      console.error(`licitacoes ${p.assunto?.slug ?? '-'}/${p.uf ?? '-'}:`, e);
      return null;
    }),
    p.assunto && !p.uf ? abertosPorUf(p.assunto.termo).catch(() => null) : Promise.resolve(null),
  ]);
  return { total: lista ? lista.total : null, editais: lista?.editais ?? [], porUf };
}

export async function metadadosDaPagina(p: Pagina): Promise<Metadata> {
  const { total } = await dadosDaPagina(p);
  const titulo = tituloDaPagina(p);
  const descricao = descricaoDaPagina(p, total ?? 0);
  return {
    title: { absolute: `${titulo} · Edital Map` },
    description: descricao,
    alternates: { canonical: caminhoDaPagina(p) },
    openGraph: { title: titulo, description: descricao, url: caminhoDaPagina(p) },
    // Zero editais sai do índice; banco fora (null) não tira a página do índice por uma queda.
    robots: total === 0 ? { index: false, follow: true } : undefined,
  };
}
