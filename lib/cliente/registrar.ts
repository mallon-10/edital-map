import type { TipoEvento, TipoEventoNavegacao } from '@/lib/eventos';

type DetalheNavegador = Record<string, string | number | boolean | null>;

/** Envia um evento de medição. Nunca quebra a tela: falhas são ignoradas. */
export function registrar(tipo: TipoEvento | TipoEventoNavegacao, detalhe: DetalheNavegador): void {
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
