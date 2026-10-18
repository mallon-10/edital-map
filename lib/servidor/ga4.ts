import 'server-only';

/** Measurement Protocol do GA4 (https://developers.google.com/analytics/devguides/collection/protocol/ga4). */
export function configGa4(env: Record<string, string | undefined> = process.env): { id: string; segredo: string } | null {
  const id = env.NEXT_PUBLIC_GA4_ID?.trim();
  const segredo = env.GA4_SEGREDO?.trim();
  return id && segredo ? { id, segredo } : null;
}

/** Manda o evento; falha só vai para o log (a compra já está gravada, a medição não pode derrubar o webhook). */
export async function enviarGa4(corpo: unknown): Promise<boolean> {
  const cfg = configGa4();
  if (!cfg) return false;
  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(cfg.id)}&api_secret=${encodeURIComponent(cfg.segredo)}`;
    const r = await fetch(url, { method: 'POST', body: JSON.stringify(corpo), signal: AbortSignal.timeout(5000) });
    if (!r.ok) console.error(`GA4: HTTP ${r.status}`);
    return r.ok;
  } catch (erro) {
    console.error('GA4:', erro instanceof Error ? erro.message : erro);
    return false;
  }
}
