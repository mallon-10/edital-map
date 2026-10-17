import { SEM_CACHE } from '@/lib/http';
import { contexto } from '@/lib/servidor/registro';
import { usoDoDia } from '@/lib/servidor/uso';

/** Uso de hoje deste navegador (faixa do plano grátis nas páginas que não calculam no servidor). */
export async function GET() {
  const uso = await usoDoDia(await contexto());
  if (!uso) return Response.json({ erro: 'Não foi possível ler o uso de hoje.' }, { status: 502, headers: SEM_CACHE });
  return Response.json(uso, { headers: SEM_CACHE });
}
