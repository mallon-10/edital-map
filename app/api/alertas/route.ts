import { LIMITES, validarPedidoAlerta } from '@/lib/eventos';
import { contexto, dentroDoLimite, gravarEvento, gravarPedido } from '@/lib/servidor/registro';

export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'Formulário inválido.' }, { status: 400 });
  }
  const v = validarPedidoAlerta(corpo);
  if (!v.ok) return v.silencioso ? Response.json({ ok: true }) : Response.json({ erro: v.erro }, { status: 400 });
  try {
    const ctx = await contexto();
    if (!(await dentroDoLimite('pedidos_alerta', ctx.ipHash, LIMITES.alertasPorHora))) {
      return Response.json({ erro: 'Muitos pedidos deste endereço. Tente de novo mais tarde.' }, { status: 429 });
    }
    const id = await gravarPedido(ctx, v.valor);
    await gravarEvento(ctx, 'pediu_alerta', { pedido: id });
    return Response.json({ ok: true }, { status: 201 });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não deu para registrar agora. Tente de novo.' }, { status: 500 });
  }
}
