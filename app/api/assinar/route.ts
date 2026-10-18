import { LIMITES } from '@/lib/eventos';
import { corpoCartao, corpoPix, lerCobranca, lerDadosCartao } from '@/lib/pagamento/cobranca';
import { validarComprador } from '@/lib/pagamento/comprador';
import { configPagamento, ofertaPara } from '@/lib/pagamento/config';
import { ErroCakto, criarCobranca } from '@/lib/servidor/caktoApi';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { criarCheckout } from '@/lib/servidor/pagamento';
import { contexto, gravarEvento, recursoDentroDoLimite } from '@/lib/servidor/registro';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };
const responder = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/**
 * Checkout próprio (spec do pagamento, revisão 2, §4): valida o comprador, grava o checkout ligado a este navegador e
 * cria a cobrança na Cakto (Pix Automático ou cartão 3DS já tokenizado no navegador). O plano só liga pelo webhook.
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const cfg = configPagamento();
  if (!cfg) return responder({ erro: 'O pagamento ainda não está aberto.' }, 503);
  const corpo = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const periodo = corpo.periodo === 'anual' ? 'anual' : 'mensal';
  const metodo = corpo.metodo === 'cartao' ? 'cartao' : 'pix';
  const validado = validarComprador(corpo.comprador);
  if (!validado.ok) return responder({ erro: 'Confira os dados destacados.', erros: validado.erros }, 400);
  const cartao = metodo === 'cartao' ? lerDadosCartao(corpo.cartao) : null;
  if (metodo === 'cartao' && !cartao) return responder({ erro: 'Não deu para validar o cartão. Tente de novo.' }, 400);
  try {
    const ctx = await contexto();
    if (!(await recursoDentroDoLimite(ctx.ipHash, 'tentou_assinar', LIMITES.assinaturasPorHora))) {
      return responder({ erro: 'Muitas tentativas. Tente de novo daqui a uma hora.' }, 429);
    }
    await gravarEvento(ctx, 'usou_recurso', { recurso: 'tentou_assinar' }).catch((e: unknown) => console.error(e));
    const codigo = await criarCheckout(ctx, 'pro', periodo);
    if (!codigo) return responder({ erro: 'Ative os cookies do navegador para assinar.' }, 400);
    const oferta = ofertaPara(cfg, periodo);
    // O visitante (cookie de 1 ano) é o identificador estável do aparelho que a Cakto pede.
    const pedido = cartao
      ? corpoCartao(oferta, validado.comprador, codigo, ctx.visitante, cartao)
      : corpoPix(oferta, validado.comprador, codigo, ctx.visitante);
    const cobranca = lerCobranca(await criarCobranca(cfg, pedido, `${codigo}-${metodo}`));
    if (cobranca.estado === 'recusado') {
      return responder({ codigo, estado: 'recusado', erro: 'O banco recusou o pagamento. Confira os dados do cartão ou pague com Pix.' });
    }
    return responder({ codigo, estado: cobranca.estado, qrCode: cobranca.qrCode, expiraEm: cobranca.expiraEm });
  } catch (erro) {
    // Sem os dados do comprador no log: só o status e a resposta da Cakto (que aponta o campo recusado).
    console.error('assinar:', erro instanceof ErroCakto ? erro.message : erro);
    const status = erro instanceof ErroCakto && erro.status === 400 ? 400 : 502;
    return responder({ erro: 'Não conseguimos criar a cobrança agora. Confira os dados ou tente de novo em instantes.' }, status);
  }
}
