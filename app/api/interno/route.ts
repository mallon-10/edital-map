import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, marcarInterno } from '@/lib/servidor/registro';

/**
 * Marca o navegador como interno (fora das métricas). Com `{ valor: <INTERNO_SEGREDO> }` (vindo de /sobre#dono=…),
 * também como dono (com o Pro).
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const corpo = (await request.json().catch(() => ({}))) as { valor?: unknown };
  await contexto();
  const dono = await marcarInterno(typeof corpo.valor === 'string' ? corpo.valor : undefined);
  return Response.json({ dono }, { headers: { 'Cache-Control': 'private, no-store' } });
}
