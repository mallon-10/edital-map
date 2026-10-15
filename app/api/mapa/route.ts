import { lerFiltros } from '@/lib/filtros';
import { CACHE_PUBLICO } from '@/lib/http';
import { pontosDoMapa } from '@/lib/servidor/consultas';

export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    return Response.json(await pontosDoMapa(filtros), { headers: CACHE_PUBLICO });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível carregar o mapa agora.' }, { status: 502 });
  }
}
