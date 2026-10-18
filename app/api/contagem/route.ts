import { lerFiltros } from '@/lib/filtros';
import { CACHE_PUBLICO } from '@/lib/http';
import { buscarEditais } from '@/lib/servidor/consultas';

/** Só o total de uma busca (botão "Ver N editais" da folha de Filtros). Não devolve editais, então não conta como busca. */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const { total } = await buscarEditais({ ...filtros, pagina: 1 });
    return Response.json({ total }, { headers: CACHE_PUBLICO });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível contar agora.' }, { status: 502 });
  }
}
