import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { pontosDoMapa } from '@/lib/servidor/consultas';

/**
 * Pontos do mapa. Recebe os mesmos parâmetros da lista; a cidade sem raio não filtra o mapa (pontosDoMapa).
 * Grátis e sem limite: nada conta nem bloqueia.
 */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    return Response.json(await pontosDoMapa(filtros), { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível carregar o mapa agora.' }, { status: 502, headers: SEM_CACHE });
  }
}
