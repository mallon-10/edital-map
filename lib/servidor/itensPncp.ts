import 'server-only';
import { BASE_PNCP, MAX_PAGINAS_ITENS, PAGINA_ITENS } from '@/worker/config';
import { itemParaLinha, type ChaveCompra, type LinhaItem } from '@/worker/mapear';
import { urlItens } from '@/worker/pncp/cliente';
import { validarItem } from '@/worker/pncp/esquemas';
import type { ItemEdital } from '../tipos';

/** Tempo máximo de cada chamada à base de itens antes de desistir (a página mostra "Itens indisponíveis agora"). */
const TIMEOUT_MS = 8_000;

export function paraItemEdital(l: LinhaItem): ItemEdital {
  return {
    numero: l.numero,
    descricao: l.descricao,
    quantidade: l.quantidade,
    unidade: l.unidade,
    valor_unitario_estimado: l.valor_unitario_estimado,
    valor_total_estimado: l.valor_total_estimado,
    sigiloso: l.sigiloso,
    material_ou_servico: l.material_ou_servico,
    beneficio_id: l.beneficio_id,
    beneficio_nome: l.beneficio_nome,
    criterio_julgamento: l.criterio_julgamento,
  };
}

/**
 * Itens do edital direto da base de itens do PNCP (sem o limite de chamadas da consulta), em ordem de número,
 * até `limite`. Mesma validação e mapeamento do worker. Rede fora, timeout ou HTTP de erro lançam exceção.
 * `base` existe para simular falha (PNCP_ITENS_BASE apontando para um endereço que não responde).
 */
export async function itensDoPncp(
  compra: ChaveCompra,
  limite: number,
  buscar: typeof fetch = fetch,
  base: string = process.env.PNCP_ITENS_BASE || BASE_PNCP,
): Promise<ItemEdital[]> {
  const porNumero = new Map<number, ItemEdital>();
  for (let pagina = 1; pagina <= MAX_PAGINAS_ITENS && porNumero.size < limite; pagina++) {
    const resp = await buscar(urlItens(compra, pagina, base), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (resp.status === 204) break;
    if (!resp.ok) throw new Error(`itens do PNCP: HTTP ${resp.status}`);
    const corpo = await resp.text();
    const lote: unknown = corpo ? JSON.parse(corpo) : [];
    if (!Array.isArray(lote)) throw new Error('itens do PNCP: resposta fora do formato');
    for (const bruto of lote) {
      const v = validarItem(bruto, compra.id);
      if (v.ok) porNumero.set(v.valor.numeroItem, paraItemEdital(itemParaLinha(v.valor, compra.id)));
    }
    if (lote.length < PAGINA_ITENS) break;
  }
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero).slice(0, limite);
}
