import 'server-only';
import { SEM_CACHE } from '../http';

/**
 * Proteção contra CSRF nas rotas que mudam a conta (entrar, sair, pedir código, radar): só JSON vindo do próprio site.
 * Um <form> de outro site não consegue mandar application/json; e o navegador diz de onde veio o pedido
 * (Sec-Fetch-Site) ou, nos antigos, manda o Origin.
 */
export function pedidoDoSite(request: Request): boolean {
  const tipo = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (tipo !== 'application/json') return false;
  const site = request.headers.get('sec-fetch-site');
  if (site !== null) return site === 'same-origin' || site === 'none';
  const origem = request.headers.get('origin');
  if (!origem) return false;
  try {
    const host = new URL(origem).host;
    return host === new URL(request.url).host || host === request.headers.get('host');
  } catch {
    return false;
  }
}

/** 403 (sem cache) quando o pedido não veio do próprio site; null quando pode seguir. */
export function recusaForaDoSite(request: Request): Response | null {
  return pedidoDoSite(request) ? null : Response.json({ erro: 'Pedido recusado.' }, { status: 403, headers: SEM_CACHE });
}
