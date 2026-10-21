import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * Cache compartilhado entre as instâncias do servidor (Data Cache da Vercel), por `segundos`. O cache em memória
 * (lib/cache.ts) é por instância: numa instância fria cada visitante esperava as consultas de novo. A chave precisa
 * levar tudo o que muda o resultado (os filtros). Falha não fica guardada. Fora de uma requisição do Next (testes,
 * scripts), carrega direto.
 */
export async function compartilhado<T>(chave: string, segundos: number, carregar: () => Promise<T>): Promise<T> {
  try {
    return await unstable_cache(carregar, ['em', chave], { revalidate: segundos })();
  } catch (e) {
    if (e instanceof Error && e.message.includes('incrementalCache missing')) return carregar();
    throw e;
  }
}
