import { estadoDoCheckout } from '@/lib/servidor/pagamento';
import { contexto } from '@/lib/servidor/registro';

/** Para a espera de /obrigado: 'pago', 'esperando' ou 'desconhecido' (a chave nunca vai nesta resposta). */
export async function GET(request: Request) {
  const codigo = new URL(request.url).searchParams.get('codigo') ?? '';
  try {
    const ctx = await contexto();
    const e = await estadoDoCheckout(codigo, ctx.visitante);
    return Response.json({ estado: e.estado }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (erro) {
    console.error(erro);
    return Response.json({ estado: 'esperando' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
