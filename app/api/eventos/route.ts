import { LIMITES, validarEvento } from '@/lib/eventos';
import { contexto, dentroDoLimite, gravarEvento } from '@/lib/servidor/registro';

export async function POST(request: Request) {
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
