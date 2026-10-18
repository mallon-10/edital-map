import { connection } from 'next/server';
import { pontosDoMapa } from '@/lib/servidor/consultas';
import type { FiltrosBusca } from '@/lib/tipos';

const SEM_FILTRO: FiltrosBusca = {
  q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: null, valorMin: null, modalidades: null, orgao: null, raio: null,
};

/**
 * Pontos do Brasil todo, sem filtro (não conta busca, fora do proxy: sem cookie). A CDN da Vercel guarda por 5 min e,
 * depois disso, entrega a versão anterior enquanto renova (o mapa da página inicial abre na hora). Erro: sem cache.
 */
export async function GET() {
  await connection();
  try {
    return Response.json(await pontosDoMapa(SEM_FILTRO), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    });
  } catch (erro) {
    console.error('mapa do Brasil:', erro);
    return Response.json({ erro: 'Não foi possível carregar o mapa agora.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
