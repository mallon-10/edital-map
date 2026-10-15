import type { Detalhe, TipoEvento } from '@/lib/eventos';

/** Envia um evento de medição. Nunca quebra a tela: falhas são ignoradas. */
export function registrar(tipo: TipoEvento, detalhe: Detalhe): void {
  try {
    void fetch('/api/eventos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tipo, detalhe }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // medição é secundária
  }
}
