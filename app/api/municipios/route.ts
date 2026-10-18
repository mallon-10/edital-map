import { CACHE_PUBLICO, SEM_CACHE } from '@/lib/http';
import { lerBuscaMunicipio } from '@/lib/radar';
import { buscarMunicipios } from '@/lib/servidor/municipios';

/** Busca de município do onboarding e da edição do radar (dado público, sem conta). Texto que não serve: lista vazia. */
export async function GET(request: Request) {
  const q = lerBuscaMunicipio(new URL(request.url).searchParams.get('q'));
  if (!q) return Response.json([], { headers: CACHE_PUBLICO });
  try {
    return Response.json(await buscarMunicipios(q), { headers: CACHE_PUBLICO });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível buscar municípios agora.' }, { status: 502, headers: SEM_CACHE });
  }
}
