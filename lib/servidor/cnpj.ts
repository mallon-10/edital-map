import 'server-only';
import { criarCache } from '../cache';
import { type Empresa, lerBrasilApi } from '../cnpj';

const DIAS_30 = 30 * 24 * 60 * 60 * 1000;
const cache = criarCache(DIAS_30, Date.now, 2000);

/** Dados públicos da empresa na Receita (BrasilAPI). null = CNPJ não encontrado. Erro de rede: lança. */
export function consultarCnpj(cnpj: string): Promise<Empresa | null> {
  return cache(`cnpj:${cnpj}`, async () => {
    // Sem identificação o firewall da BrasilAPI responde 403.
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { 'User-Agent': 'EditalMap/1.0 (+https://www.editalmap.com.br)', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 404 || r.status === 400) return null;
    if (!r.ok) throw new Error(`BrasilAPI HTTP ${r.status}`);
    return lerBrasilApi(await r.json());
  });
}
