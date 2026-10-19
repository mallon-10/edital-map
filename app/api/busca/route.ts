import { lerFiltros } from '@/lib/filtros';
import { SEM_CACHE } from '@/lib/http';
import { buscarEditais } from '@/lib/servidor/consultas';

/** Lista de editais. Grátis e sem limite (decisão de 19/10/2026): nada conta nem bloqueia. */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    return Response.json(await buscarEditais(filtros), { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
