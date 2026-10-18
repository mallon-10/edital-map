import 'server-only';

/**
 * Limite de tentativas em memória (janela deslizante por chave), para as rotas de login por código.
 *
 * Vale POR INSTÂNCIA da função: a Vercel (Fluid Compute) reaproveita a mesma instância entre pedidos, então o contador
 * segura o grosso de um script, mas duas instâncias têm contadores separados e um deploy zera tudo. Os limites do
 * próprio Supabase Auth continuam como segunda camada. Um contador durável no banco fica para quando for preciso.
 *
 * Por que existe: o Supabase limita /auth/v1/verify e o envio de e-mail por IP, e quem chama é o nosso servidor
 * (IP da Vercel, comum a todos). Sem este limite, um script errando códigos esgota a cota de todo mundo e o código
 * de 6 dígitos fica sem trava própria contra força bruta.
 */

export type ConfigLimite = { max: number; janelaMs: number };

export type Limite = {
  readonly config: ConfigLimite;
  /** true = já chegou ao máximo na janela (o pedido deve levar 429). Chave nula nunca bloqueia. */
  excedido(chave: string | null): boolean;
  /** Conta uma tentativa agora. */
  registrar(chave: string | null): void;
  /** Esquece a chave (ex.: login certo zera as falhas daquele e-mail). */
  zerar(chave: string | null): void;
  /** Esquece tudo (testes). */
  zerarTudo(): void;
  tamanho(): number;
  marcas(chave: string): number;
};

export function criarLimite(opcoes: ConfigLimite & { maxChaves?: number; agora?: () => number }): Limite {
  const { max, janelaMs, maxChaves = 10_000, agora = Date.now } = opcoes;
  const mapa = new Map<string, number[]>();

  /** Marcas ainda dentro da janela (apaga a chave se não sobrou nenhuma). */
  function vivas(chave: string, t: number): number[] {
    const lista = mapa.get(chave);
    if (!lista) return [];
    const v = lista.filter((x) => t - x < janelaMs);
    if (v.length === 0) mapa.delete(chave);
    else if (v.length !== lista.length) mapa.set(chave, v);
    return v;
  }

  function aparar(t: number) {
    if (mapa.size <= maxChaves) return;
    for (const chave of [...mapa.keys()]) vivas(chave, t);
    // Ainda acima do teto: sai quem foi tocado há mais tempo (o Map guarda a ordem de inserção).
    for (const chave of mapa.keys()) {
      if (mapa.size <= maxChaves) break;
      mapa.delete(chave);
    }
  }

  return {
    config: { max, janelaMs },
    excedido(chave) {
      if (chave === null) return false;
      return vivas(chave, agora()).length >= max;
    },
    registrar(chave) {
      if (chave === null) return;
      const t = agora();
      const v = [...vivas(chave, t), t].slice(-max);
      mapa.delete(chave); // volta para o fim da ordem (mais recente)
      mapa.set(chave, v);
      aparar(t);
    },
    zerar(chave) {
      if (chave !== null) mapa.delete(chave);
    },
    zerarTudo() {
      mapa.clear();
    },
    tamanho() {
      return mapa.size;
    },
    marcas(chave) {
      return mapa.get(chave)?.length ?? 0;
    },
  };
}

const MINUTO = 60 * 1000;

/** Limites das rotas da conta. E-mail já normalizado (lerEmail); IP só como hash (hashDoIp). */
export const LIMITES_CONTA = {
  /** /api/conta/entrar: códigos errados por e-mail (força bruta num e-mail). */
  falhasPorEmail: criarLimite({ max: 5, janelaMs: 15 * MINUTO }),
  /** /api/conta/entrar: códigos errados por IP (um script variando e-mails). */
  falhasPorIp: criarLimite({ max: 20, janelaMs: 15 * MINUTO }),
  /** /api/conta/codigo: pedidos de código por e-mail. */
  codigosPorEmail: criarLimite({ max: 5, janelaMs: 60 * MINUTO }),
  /** /api/conta/codigo: pedidos de código por IP. */
  codigosPorIp: criarLimite({ max: 20, janelaMs: 60 * MINUTO }),
};
