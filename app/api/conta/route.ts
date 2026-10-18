import { SEM_CACHE } from '@/lib/http';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Quem está entrado neste navegador (menu da conta). Só o e-mail; o id fica no servidor. */
export async function GET() {
  const usuario = await usuarioAtual();
  return Response.json({ email: usuario?.email ?? null }, { headers: SEM_CACHE });
}
