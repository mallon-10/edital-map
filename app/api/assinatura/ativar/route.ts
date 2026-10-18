import { LIMITES } from '@/lib/eventos';
import { lerPedidoChave } from '@/lib/pagamento/chave';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { ativarChave } from '@/lib/servidor/pagamento';
import { contexto, gravarEvento, recursoDentroDoLimite } from '@/lib/servidor/registro';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

/** Liga este navegador à assinatura da chave de acesso (até 3 navegadores; 10 tentativas por hora por IP). */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const pedido = lerPedidoChave(await request.json().catch(() => null));
  if (!pedido.ok) return Response.json({ erro: pedido.erro }, { status: 400, headers: SEM_CACHE });
  try {
    const ctx = await contexto();
    if (!(await recursoDentroDoLimite(ctx.ipHash, 'ativou_chave', LIMITES.ativacoesPorHora))) {
      return Response.json({ erro: 'Muitas tentativas. Tente de novo daqui a uma hora.' }, { status: 429, headers: SEM_CACHE });
    }
    // A tentativa conta mesmo se a chave estiver errada (é o que impede adivinhar).
    await gravarEvento(ctx, 'usou_recurso', { recurso: 'ativou_chave' }).catch((e: unknown) => console.error(e));
    const r = await ativarChave(pedido.chave, ctx.visitante);
    if (r === 'invalida') return Response.json({ erro: 'Chave não encontrada. Confira e tente de novo.' }, { status: 404, headers: SEM_CACHE });
    if (r === 'cheia') {
      return Response.json(
        { erro: 'Esta chave já está em 3 navegadores. Escreva para mallon@escalav.com.br para liberar.' },
        { status: 409, headers: SEM_CACHE },
      );
    }
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não deu para usar a chave agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
