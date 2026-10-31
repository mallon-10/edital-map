import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { buscarNoPlano } from '@/lib/servidor/buscaDoPlano';
import { planoAtual } from '@/lib/servidor/plano';
import { contexto } from '@/lib/servidor/registro';

/** Lista de editais. Sem termo, livre; com termo, no grátis, só os liberados (lib/limiteBusca.ts). */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    return Response.json(await buscarNoPlano(filtros, async () => planoAtual(await contexto())), { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
