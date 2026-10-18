/** Pedidos JSON do navegador às rotas da conta (salvos e alertas): só JSON do próprio site (a rota recusa o resto). */

export type RespostaAcao =
  | { ok: true; corpo: Record<string, unknown> }
  | { ok: false; codigo: 'entrar' | 'plano' | 'limite' | 'falha'; erro: string };

export const FALHA_PEDIDO = 'Não foi possível concluir agora. Tente de novo.';

/**
 * Status + corpo da rota → resposta: 401 entrar, 402 plano/limite (convite aos planos), o resto falha com a mensagem da
 * rota (503 "Não deu para confirmar seu plano agora", 404, 400) ou a genérica (429, 502, corpo sem mensagem).
 */
export function respostaDaAcao(status: number, corpo: unknown): RespostaAcao {
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as Record<string, unknown>;
  if (status >= 200 && status < 300) return { ok: true, corpo: c };
  const erro = typeof c.erro === 'string' && c.erro ? c.erro : FALHA_PEDIDO;
  if (status === 401) return { ok: false, codigo: 'entrar', erro };
  if (status === 402) return { ok: false, codigo: c.codigo === 'limite' ? 'limite' : 'plano', erro };
  return { ok: false, codigo: 'falha', erro };
}

export async function pedirJson(url: string, metodo: 'POST' | 'PATCH' | 'DELETE', corpo: unknown = {}): Promise<RespostaAcao> {
  try {
    const r = await fetch(url, { method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    return respostaDaAcao(r.status, await r.json().catch(() => null));
  } catch {
    return { ok: false, codigo: 'falha', erro: FALHA_PEDIDO };
  }
}

/** Sem sessão (ou sessão vencida): entra e volta para esta mesma página. */
export function irParaEntrar(): void {
  window.location.assign(`/entrar?voltar=${encodeURIComponent(window.location.pathname + window.location.search)}`);
}
