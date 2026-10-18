import { PLANOS_PAGOS, type PlanoPago } from '@/lib/eventos';
import { configPagamento, linkCheckout, ofertaPara } from '@/lib/pagamento/config';
import { PERIODOS, type Periodo } from '@/lib/planos';
import { criarCheckout } from '@/lib/servidor/pagamento';
import { contexto, gravarEvento } from '@/lib/servidor/registro';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };
const redirecionar = (destino: string) => new Response(null, { status: 303, headers: { Location: destino, ...SEM_CACHE } });

/**
 * "Assinar" em /planos: grava o código do checkout ligado a este navegador e manda para a Cakto com ?callback=.
 * Pagamento desligado ou parâmetro inválido: volta para /planos.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const plano = url.searchParams.get('plano');
  const periodo = url.searchParams.get('periodo') ?? 'mensal';
  const cfg = configPagamento();
  if (!cfg || !PLANOS_PAGOS.includes(plano as PlanoPago) || !PERIODOS.includes(periodo as Periodo)) {
    return redirecionar(new URL('/planos', url).toString());
  }
  const p = plano as PlanoPago;
  const per = periodo as Periodo;
  let codigo: string | null = null;
  try {
    const ctx = await contexto();
    codigo = await criarCheckout(ctx, p, per);
    await gravarEvento(ctx, 'quer_recurso', { recurso: p === 'basic' ? 'plano_basic' : 'plano_pro' }).catch((e: unknown) => console.error(e));
  } catch (erro) {
    // Sem o código o plano não liga sozinho neste navegador, mas a compra continua possível (liga pela chave de acesso).
    console.error('checkout:', erro);
  }
  return redirecionar(linkCheckout(ofertaPara(cfg, p, per), codigo));
}
