import 'server-only';
import { unstable_cache } from 'next/cache';

type Gravado<T> = { em: number; valor: T };

/**
 * Passado o prazo, o Data Cache ainda entrega a cópia vencida (stale-while-revalidate, por até um ano) e só renova
 * em segundo plano: depois de um tempo sem visitas, a lista vinha com editais encerrados há horas. Aqui a cópia
 * vencida não vale: carrega de novo (a renovação em segundo plano continua).
 */
export async function dentroDoPrazo<T>(
  ler: () => Promise<Gravado<T>>,
  carregar: () => Promise<T>,
  segundos: number,
  agora: () => number = Date.now,
): Promise<T> {
  const g = await ler();
  return agora() - g.em <= segundos * 1000 ? g.valor : carregar();
}

/**
 * Cache compartilhado entre as instâncias do servidor (Data Cache da Vercel), por `segundos`. O cache em memória
 * (lib/cache.ts) é por instância: numa instância fria cada visitante esperava as consultas de novo. A chave precisa
 * levar tudo o que muda o resultado (os filtros). Falha não fica guardada. Fora de uma requisição do Next (testes,
 * scripts), carrega direto.
 */
export async function compartilhado<T>(chave: string, segundos: number, carregar: () => Promise<T>): Promise<T> {
  try {
    const ler = unstable_cache(async (): Promise<Gravado<T>> => ({ em: Date.now(), valor: await carregar() }), ['em-prazo', chave], {
      revalidate: segundos,
    });
    return await dentroDoPrazo(ler, carregar, segundos);
  } catch (e) {
    if (e instanceof Error && e.message.includes('incrementalCache missing')) return carregar();
    throw e;
  }
}
