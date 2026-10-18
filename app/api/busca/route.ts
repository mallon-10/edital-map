import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { corpoLimite, STATUS_LIMITE, type RespostaBusca } from '@/lib/limites';
import { buscarEditais } from '@/lib/servidor/consultas';
import { contexto } from '@/lib/servidor/registro';
import { decidirBusca } from '@/lib/servidor/uso';

/** Lista de editais. Conta a busca no limite do grátis antes de consultar; além do limite, 402 com o sinal. */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const decisao = await decidirBusca(await contexto(), filtros, { avisar: true });
    if (!decisao.permitido) {
      return Response.json(corpoLimite('busca', decisao.limite.usados, decisao.plano), { status: STATUS_LIMITE, headers: SEM_CACHE });
    }
    const resposta: RespostaBusca = { ...(await buscarEditais(filtros)), buscasUsadas: decisao.usados };
    return Response.json(resposta, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
