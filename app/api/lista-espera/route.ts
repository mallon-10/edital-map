import { LIMITES, validarListaEspera } from '@/lib/eventos';
import { contexto, dentroDoLimite, gravarListaEspera } from '@/lib/servidor/registro';

/** "Quero o Pro" (pagamento desligado): guarda o e-mail para avisar quando o pagamento abrir. */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'Formulário inválido.' }, { status: 400 });
  }
  const v = validarListaEspera(corpo);
  if (!v.ok) return v.silencioso ? Response.json({ ok: true }) : Response.json({ erro: v.erro }, { status: 400 });
  try {
    const ctx = await contexto();
    if (!(await dentroDoLimite('lista_espera', ctx.ipHash, LIMITES.listaEsperaPorHora))) {
      return Response.json({ erro: 'Muitos pedidos deste endereço. Tente de novo mais tarde.' }, { status: 429 });
    }
    await gravarListaEspera(ctx, v.valor);
    return Response.json({ ok: true }, { status: 201 });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não deu para registrar agora. Tente de novo.' }, { status: 500 });
  }
}
