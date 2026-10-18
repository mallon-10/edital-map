import { assuntosDaEmpresa, normalizarCnpj } from '@/lib/cnpj';
import { LIMITES } from '@/lib/eventos';
import { consultarCnpj } from '@/lib/servidor/cnpj';
import { contexto, gravarEvento, recursoDentroDoLimite } from '@/lib/servidor/registro';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };
const responder = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

type Contexto = { params: Promise<{ cnpj: string }> };

/**
 * Empresa pelo CNPJ (BrasilAPI) e os assuntos da busca pela atividade (CNAE). 20 por hora por IP. Nada é gravado
 * além do evento de uso (sem o CNPJ). Também serve ao onboarding do Meu Radar.
 */
export async function GET(_: Request, { params }: Contexto) {
  const cnpj = normalizarCnpj(decodeURIComponent((await params).cnpj));
  if (!cnpj) return responder({ erro: 'CNPJ inválido. Confira os 14 números.' }, 400);
  try {
    const ctx = await contexto();
    if (!(await recursoDentroDoLimite(ctx.ipHash, 'consultou_cnpj', LIMITES.cnpjPorHora))) {
      return responder({ erro: 'Muitas consultas. Tente de novo daqui a uma hora.' }, 429);
    }
    await gravarEvento(ctx, 'usou_recurso', { recurso: 'consultou_cnpj' }).catch((e: unknown) => console.error(e));
    const empresa = await consultarCnpj(cnpj);
    if (!empresa) return responder({ erro: 'Não encontramos esse CNPJ na Receita.' }, 404);
    const assuntos = assuntosDaEmpresa(empresa.cnaes);
    return responder({
      empresa: { razao: empresa.razao, fantasia: empresa.fantasia, uf: empresa.uf, municipio: empresa.municipio, ativa: empresa.ativa, atividade: empresa.atividade },
      assuntos: assuntos.map((a) => ({ slug: a.slug, nome: a.nome, termo: a.termo, principal: a.principal })),
    });
  } catch (erro) {
    console.error('cnpj:', erro instanceof Error ? erro.message : erro);
    return responder({ erro: 'A consulta à Receita não respondeu agora. Tente de novo em instantes.' }, 502);
  }
}
