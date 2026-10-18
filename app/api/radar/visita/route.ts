import { SEM_CACHE } from '@/lib/http';
import { marcarVisitaRadar } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { usuarioAtual } from '@/lib/servidor/sessao';

/**
 * Grava a visita ao Meu Radar (RegistrarVisitaRadar, ao sair da página): "Novas" passa a contar daqui.
 * Só JSON do próprio site (CSRF); o dono vem só da sessão (usuarioAtual).
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return new Response(null, { status: 401, headers: SEM_CACHE });
  try {
    await marcarVisitaRadar(usuario);
    return new Response(null, { status: 204, headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return new Response(null, { status: 502, headers: SEM_CACHE });
  }
}
