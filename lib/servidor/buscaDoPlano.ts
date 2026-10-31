import 'server-only';
import { buscaLimitada, EDITAIS_GRATIS_POR_BUSCA, limitarResultado } from '../limiteBusca';
import type { Plano } from '../planos';
import { temTermo } from '../relevancia/termos';
import type { FiltrosBusca, ResultadoBusca } from '../tipos';
import { buscarEditais } from './consultas';
import { pagamentoLigado } from './plano';

/** Sem termo não há limite: o plano nem é consultado. */
async function limitada(f: FiltrosBusca, plano: () => Promise<Plano>): Promise<boolean> {
  if (!temTermo(f.q) || !pagamentoLigado()) return false;
  return buscaLimitada(f.q, { plano: await plano(), pagamento: true });
}

/** Lista da busca no plano de quem pediu (lib/limiteBusca.ts). No grátis com termo, sempre a primeira página: `pagina=2` não abre o resto. */
export async function buscarNoPlano(f: FiltrosBusca, plano: () => Promise<Plano>): Promise<ResultadoBusca> {
  if (await limitada(f, plano)) return limitarResultado(await buscarEditais({ ...f, pagina: 1 }));
  return buscarEditais(f);
}

/** Máximo de linhas do CSV no plano de quem pediu; undefined = o teto normal. */
export async function limiteDaExportacao(f: FiltrosBusca, plano: () => Promise<Plano>): Promise<number | undefined> {
  return (await limitada(f, plano)) ? EDITAIS_GRATIS_POR_BUSCA : undefined;
}
