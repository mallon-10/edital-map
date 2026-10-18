import 'server-only';

/**
 * API pública da Cakto no servidor (https://docs.cakto.com.br/authentication): token OAuth2 guardado em memória até
 * 5 min antes de expirar (a Cakto limita a emissão de tokens) e a cobrança direta com X-Idempotency-Key.
 */
const BASE = 'https://api.cakto.com.br/public_api';
const MARGEM_MS = 5 * 60_000;
const TEMPO_LIMITE_MS = 20_000;

export class ErroCakto extends Error {
  constructor(
    readonly status: number,
    corpo: string,
  ) {
    super(`Cakto HTTP ${status}: ${corpo.slice(0, 500)}`);
    this.name = 'ErroCakto';
  }
}

type Credenciais = { clienteId: string; clienteSegredo: string };
let guardado: { token: string; ate: number } | null = null;

export function limparTokenCakto(): void {
  guardado = null;
}

async function token(c: Credenciais): Promise<string> {
  if (guardado && guardado.ate > Date.now()) return guardado.token;
  const r = await fetch(`${BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.clienteId, client_secret: c.clienteSegredo }).toString(),
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!r.ok) throw new ErroCakto(r.status, await r.text());
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new ErroCakto(r.status, 'token sem access_token');
  guardado = { token: j.access_token, ate: Date.now() + (j.expires_in ?? 3600) * 1000 - MARGEM_MS };
  return guardado.token;
}

/** POST /payments/ (Pix Automático ou cartão 3DS). Devolve o JSON da Cakto; erro HTTP vira ErroCakto. */
export async function criarCobranca(c: Credenciais, corpo: unknown, idempotencia: string): Promise<unknown> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const r = await fetch(`${BASE}/payments/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await token(c)}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencia },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    // Token revogado antes da hora: pede outro uma vez (a mesma idempotência não cobra duas vezes).
    if (r.status === 401 && tentativa === 0) {
      limparTokenCakto();
      continue;
    }
    const texto = await r.text();
    if (!r.ok) throw new ErroCakto(r.status, texto);
    return texto ? (JSON.parse(texto) as unknown) : null;
  }
  throw new ErroCakto(401, 'token recusado duas vezes');
}
