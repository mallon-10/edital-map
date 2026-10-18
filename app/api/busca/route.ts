import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { corpoLimite, corpoRecursoPro, precisaPro, STATUS_LIMITE, type RespostaBusca } from '@/lib/limites';
import { buscarEditais } from '@/lib/servidor/consultas';
import { contexto } from '@/lib/servidor/registro';
import { decidirBusca, semRecursoPro } from '@/lib/servidor/uso';

/** Lista de editais. Conta a busca no limite do grátis antes de consultar; além do limite, 402 com o sinal. */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const ctx = await contexto();
    // Raio e órgão são do Pro: barrados antes de contar a busca.
    if (precisaPro(filtros) && (await semRecursoPro(ctx))) {
      return Response.json(corpoRecursoPro(), { status: STATUS_LIMITE, headers: SEM_CACHE });
    }
    const decisao = await decidirBusca(ctx, filtros, { avisar: true });
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
