import { LIMITES, validarEvento } from '@/lib/eventos';
import { ehRobo } from '@/lib/robos';
import { contexto, dentroDoLimite, gravarEvento } from '@/lib/servidor/registro';

export async function POST(request: Request) {
  // Robô que roda JavaScript não entra nas métricas (o proxy já não lhe dá cookie).
  if (ehRobo(request.headers.get('user-agent'))) return new Response(null, { status: 204 });
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'JSON inválido' }, { status: 400 });
  }
  const v = validarEvento(corpo);
  if (!v.ok) return Response.json({ erro: v.erro }, { status: 400 });
  try {
    const ctx = await contexto();
    if (!(await dentroDoLimite('eventos', ctx.ipHash, LIMITES.eventosPorHora))) {
      return Response.json({ erro: 'Muitos eventos deste endereço.' }, { status: 429 });
    }
    await gravarEvento(ctx, v.valor.tipo, v.valor.detalhe);
    return new Response(null, { status: 204 });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Falha ao registrar.' }, { status: 500 });
  }
}
