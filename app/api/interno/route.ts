import { contexto, marcarInterno } from '@/lib/servidor/registro';

export async function POST() {
  await contexto();
  await marcarInterno();
  return new Response(null, { status: 204 });
}
