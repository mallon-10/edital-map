import { connection } from 'next/server';
import { url } from '@/lib/seo/site';
import { arquivosDoSitemap, xmlIndice } from '@/lib/seo/sitemap';
import { totalEditaisAbertos } from '@/lib/servidor/consultas';

/** Índice do sitemap (apontado pelo robots.txt): o arquivo de páginas e um por lote de editais abertos. */
export async function GET(): Promise<Response> {
  // Dinâmica: sem isto o Next gravaria o índice no build, com o total de editais daquele momento.
  await connection();
  // Banco fora: só o arquivo de páginas (o próximo pedido, depois do cache, traz os editais de volta).
  const total = await totalEditaisAbertos().catch(() => 0);
  const xml = xmlIndice(arquivosDoSitemap(total).map((a) => url(`/sitemaps/${a}`)));
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' },
  });
}
