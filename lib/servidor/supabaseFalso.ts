/**
 * Supabase falso para testes de servidor: cada `from(tabela)` e `rpc(nome)` devolve a próxima resposta da fila daquela
 * tabela ou função e registra a operação (filtros, valores). Só para testes.
 */
export type Resposta = { data: unknown; error: { message: string; code?: string } | null };
export type Operacao = { alvo: string; acao: string; valores?: unknown; filtros: Array<[string, unknown]> };

export function criarSupabaseFalso() {
  const filas = new Map<string, Resposta[]>();
  const operacoes: Operacao[] = [];
  const proxima = (alvo: string): Resposta => filas.get(alvo)?.shift() ?? { data: null, error: null };

  function construtor(alvo: string, acao: string, valores?: unknown) {
    const op: Operacao = { alvo, acao, valores, filtros: [] };
    operacoes.push(op);
    let resposta: Resposta | null = null;
    const obter = () => (resposta ??= proxima(alvo));
    const b: Record<string, unknown> = {};
    for (const nome of ['select', 'order', 'limit', 'returns']) b[nome] = () => b;
    for (const nome of ['eq', 'gt', 'gte', 'lt', 'neq', 'in', 'is']) {
      b[nome] = (coluna: string, valor: unknown) => {
        op.filtros.push([`${nome}:${coluna}`, valor]);
        return b;
      };
    }
    b.maybeSingle = () => Promise.resolve(obter());
    b.single = () => Promise.resolve(obter());
    b.then = (ok: (v: Resposta) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(obter()).then(ok, ko);
    return b;
  }

  const cliente = {
    from: (tabela: string) => ({
      select: (..._a: unknown[]) => construtor(tabela, 'select'),
      insert: (valores: unknown) => construtor(tabela, 'insert', valores),
      update: (valores: unknown) => construtor(tabela, 'update', valores),
      delete: () => construtor(tabela, 'delete'),
    }),
    rpc: (nome: string, args: unknown) => construtor(`rpc:${nome}`, 'rpc', args),
  };

  return {
    cliente,
    operacoes,
    responder(alvo: string, ...respostas: Resposta[]) {
      filas.set(alvo, [...(filas.get(alvo) ?? []), ...respostas]);
    },
    limpar() {
      filas.clear();
      operacoes.length = 0;
    },
  };
}
