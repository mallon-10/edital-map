import type { Assunto } from './assuntos';
import { MODALIDADES } from './modalidades';
import { caminhoDaPagina } from './textos';

/**
 * Sitemap em rotas próprias (app/sitemap.xml e app/sitemaps/[arquivo]): o índice e os arquivos saem a cada pedido, com
 * cache de 1 h no CDN. O generateSitemaps do Next 16 não gera índice e fixa a quantidade de arquivos no build.
 */

/** Editais por arquivo (o formato aceita até 50.000 endereços). */
export const POR_ARQUIVO = 40_000;

/** 'paginas.xml' (início, planos, /licitacoes…) e um 'editais-N.xml' por lote de POR_ARQUIVO. */
export function arquivosDoSitemap(totalEditais: number): string[] {
  const lotes = Math.ceil(totalEditais / POR_ARQUIVO);
  return ['paginas.xml', ...Array.from({ length: lotes }, (_, i) => `editais-${i + 1}.xml`)];
}

/** 'editais-3.xml' → 3; qualquer outro nome → null. */
export function loteDoArquivo(arquivo: string): number | null {
  const m = /^editais-([1-9]\d{0,3})\.xml$/.exec(arquivo);
  return m ? Number(m[1]) : null;
}

/** Caminhos de /licitacoes com pelo menos um edital aberto (contagem do assunto por UF; assunto null = todos). */
export function paginasFixas(contagens: Array<{ assunto: Assunto | null; porUf: Record<string, number> }>): string[] {
  const caminhos: string[] = [];
  for (const { assunto, porUf } of contagens) {
    const ufs = Object.keys(porUf).filter((uf) => porUf[uf] > 0).sort();
    if (assunto === null) caminhos.push('/licitacoes');
    else if (ufs.length === 0) continue;
    else caminhos.push(caminhoDaPagina({ assunto, uf: null }));
    for (const uf of ufs) caminhos.push(caminhoDaPagina({ assunto, uf }));
  }
  return caminhos;
}

/** Modalidades com edital aberto: a página no Brasil e as das UFs com editais (contagem de abertos_por_modalidade, 0023). */
export function paginasDeModalidade(porModalidade: Record<number, Record<string, number>>): string[] {
  const caminhos: string[] = [];
  for (const m of MODALIDADES) {
    const porUf = porModalidade[m.id] ?? {};
    const ufs = Object.keys(porUf).filter((uf) => porUf[uf] > 0).sort();
    if (ufs.length === 0) continue;
    caminhos.push(caminhoDaPagina({ assunto: null, modalidade: m, uf: null }));
    for (const uf of ufs) caminhos.push(caminhoDaPagina({ assunto: null, modalidade: m, uf }));
  }
  return caminhos;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CABECALHO = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

export function xmlIndice(urls: string[]): string {
  const itens = urls.map((u) => `<sitemap><loc>${escapar(u)}</loc></sitemap>\n`).join('');
  return `${CABECALHO}<sitemapindex xmlns="${NS}">\n${itens}</sitemapindex>\n`;
}

export function xmlUrls(entradas: Array<{ url: string; lastModified?: string }>): string {
  const itens = entradas
    .map((e) => `<url><loc>${escapar(e.url)}</loc>${e.lastModified ? `<lastmod>${escapar(e.lastModified)}</lastmod>` : ''}</url>\n`)
    .join('');
  return `${CABECALHO}<urlset xmlns="${NS}">\n${itens}</urlset>\n`;
}
