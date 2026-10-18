import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { corpoLimite, STATUS_LIMITE } from '@/lib/limites';
import { pontosDoMapa } from '@/lib/servidor/consultas';
import { contexto } from '@/lib/servidor/registro';
import { decidirBusca } from '@/lib/servidor/uso';

/**
 * Pontos do mapa. Recebe os mesmos parâmetros da lista (mesma chave no limite do dia: lista + mapa contam uma vez);
 * a cidade sem raio não filtra o mapa (pontosDoMapa). Além do limite, 402 (o navegador mantém o último mapa permitido).
 */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const decisao = await decidirBusca(await contexto(), filtros, { avisar: false });
    if (!decisao.permitido) {
      return Response.json(corpoLimite('busca', decisao.limite.usados, decisao.plano), { status: STATUS_LIMITE, headers: SEM_CACHE });
    }
    return Response.json(await pontosDoMapa(filtros), { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível carregar o mapa agora.' }, { status: 502, headers: SEM_CACHE });
  }
}
