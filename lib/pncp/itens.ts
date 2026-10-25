import { BASE_PNCP, MAX_PAGINAS_ITENS, PAGINA_ITENS } from '@/worker/config';
import { itemParaLinha, type ChaveCompra, type LinhaItem } from '@/worker/mapear';
import { urlItens } from '@/worker/pncp/cliente';
import { validarItem } from '@/worker/pncp/esquemas';
import type { ItemEdital } from '../tipos';
import { comPrazo } from './prazo';

/**
 * Tempo máximo de cada chamada à base de itens antes de desistir (a página mostra "Itens indisponíveis agora").
 * Roda no navegador com a página já na tela, então pode esperar bem mais que o servidor esperava (8 s): em 25/10/2026 o PNCP levava 17 s por chamada.
 */
const TIMEOUT_MS = 25_000;
/** Prazo para a leitura inteira (todas as páginas): passou disso, vale como falha e não como lista parcial. */
const PRAZO_TOTAL_MS = 45_000;

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
 * Roda no navegador de quem visita (o PNCP libera CORS): o servidor da Vercel ficava sem resposta do PNCP.
 */
export async function itensDoPncp(
  compra: ChaveCompra,
  limite: number,
  buscar: typeof fetch = fetch,
  base: string = BASE_PNCP,
  prazoTotalMs: number = PRAZO_TOTAL_MS,
): Promise<ItemEdital[]> {
  const total = comPrazo(prazoTotalMs);
  const prazo = total.signal;
  const esgotado = () => new Error('itens do PNCP: prazo total esgotado');
  const porNumero = new Map<number, ItemEdital>();
  try {
    for (let pagina = 1; pagina <= MAX_PAGINAS_ITENS && porNumero.size < limite; pagina++) {
      if (prazo.aborted) throw esgotado();
      let lote: unknown;
      const chamada = comPrazo(TIMEOUT_MS, prazo);
      try {
        const resp = await buscar(urlItens(compra, pagina, base), { headers: { Accept: 'application/json' }, signal: chamada.signal });
        if (resp.status === 204) break;
        if (!resp.ok) throw new Error(`itens do PNCP: HTTP ${resp.status}`);
        const corpo = await resp.text();
        lote = corpo ? JSON.parse(corpo) : [];
      } catch (erro) {
        if (prazo.aborted) throw esgotado();
        throw erro;
      } finally {
        chamada.encerrar();
      }
      if (!Array.isArray(lote)) throw new Error('itens do PNCP: resposta fora do formato');
      for (const bruto of lote) {
        const v = validarItem(bruto, compra.id);
        if (v.ok) porNumero.set(v.valor.numeroItem, paraItemEdital(itemParaLinha(v.valor, compra.id)));
      }
      if (lote.length < PAGINA_ITENS) break;
    }
  } finally {
    total.encerrar();
  }
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero).slice(0, limite);
}
