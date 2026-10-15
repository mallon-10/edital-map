type Entrada = { expira: number; valor: Promise<unknown> };

/** Cache em memória por instância do servidor. Guarda a promessa (cargas simultâneas compartilham) e não guarda falhas. */
export function criarCache(ttlMs: number, agora: () => number = Date.now, maxEntradas = 500) {
  const mapa = new Map<string, Entrada>();
  return function emCache<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
    const t = agora();
    const existente = mapa.get(chave);
    if (existente && existente.expira > t) return existente.valor as Promise<T>;
    const valor = carregar();
    mapa.set(chave, { expira: t + ttlMs, valor });
    valor.catch(() => {
      if (mapa.get(chave)?.valor === valor) mapa.delete(chave);
    });
    if (mapa.size > maxEntradas) {
      const maisAntiga = mapa.keys().next().value;
      if (maisAntiga !== undefined) mapa.delete(maisAntiga);
    }
    return valor;
  };
}
