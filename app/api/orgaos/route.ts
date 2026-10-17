import { lerTermoOrgao } from '@/lib/filtros';
import { CACHE_PUBLICO } from '@/lib/http';
import { orgaosAbertos } from '@/lib/servidor/consultas';

export async function GET(request: Request) {
  const q = lerTermoOrgao(new URL(request.url).searchParams.get('q'));
  if (!q) return Response.json({ erro: 'Digite pelo menos 3 letras do nome do órgão.' }, { status: 400 });
  try {
    return Response.json(await orgaosAbertos(q), { headers: CACHE_PUBLICO });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar os órgãos agora.' }, { status: 502 });
  }
}
