import type { FiltrosBusca, ResultadoBusca } from './tipos';

/** Limites do plano grátis por dia (calendário de Brasília), por navegador. */
export const LIMITE_GRATIS = { busca: 3, edital: 3 } as const;
export type TipoUso = keyof typeof LIMITE_GRATIS;

/** Plano do navegador (spec do pagamento, §5). */
export type Plano = 'gratis' | 'basic' | 'pro';

/** Limites por dia de cada plano. O Pro é "uso justo": sem teto na tela, 300 por trás contra abuso. */
export const LIMITES_PLANO: Record<Plano, Record<TipoUso, number>> = {
  gratis: { ...LIMITE_GRATIS },
  basic: { busca: 15, edital: 15 },
  pro: { busca: 300, edital: 300 },
};

const NOME_PLANO: Record<Plano, string> = { gratis: 'Grátis', basic: 'Basic', pro: 'Pro' };

/**
 * Uso do dia que a faixa mostra. `interno`: navegador do dono, sem limite e sem faixa. `plano` ausente = grátis
 * (o servidor sempre manda; o ausente é para usos antigos e testes).
 */
export type UsoHoje = { interno: boolean; plano?: Plano; buscas: number; editais: number };
/** Quantidades já usadas hoje. */
type Usados = Pick<UsoHoje, 'buscas' | 'editais'>;

/** Limite atingido: tipo, quantos já foram usados hoje e o máximo do grátis. */
export type Limite = { tipo: TipoUso; usados: number; maximo: number };

/** Sinal de limite das rotas. 402 ("pagamento necessário") porque o 429 do site é só o limite por hora. */
export const STATUS_LIMITE = 402;
export const CODIGO_LIMITE = 'limite_diario';
export type CorpoLimite = { erro: string; codigo: typeof CODIGO_LIMITE; limite: Limite };

/** Resposta de /api/busca: a lista e as buscas usadas hoje (null = não contou: busca vazia, interno ou banco fora). */
export type RespostaBusca = ResultadoBusca & { buscasUsadas: number | null };

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Combinação que conta como "uma busca" no dia: termo (sem acento, minúsculo, espaços colapsados), UF, município,
 * valor, modalidades (em ordem), órgão e raio. Prazo (`dias`), página (`pagina`) e ordem (`ordem`) não entram (nem a vista, que nem chega à API); com raio a UF não
 * filtra (o raio atravessa a divisa), então também não entra. `null` = busca vazia (página inicial sem nada), que não conta.
 */
export function combinacaoBusca(f: FiltrosBusca): string | null {
  const q = f.q ? semAcento(f.q).toLowerCase().replace(/\s+/g, ' ').trim() || null : null;
  const uf = f.raio ? null : f.uf;
  const modalidades = f.modalidades?.length ? [...f.modalidades].sort((a, b) => a - b) : null;
  const partes = [q, uf, f.ibge, f.valorMin, modalidades, f.orgao, f.raio];
  return partes.every((p) => p === null) ? null : JSON.stringify(partes);
}

const PALAVRAS: Record<TipoUso, { varios: string; nenhum: string }> = {
  busca: { varios: 'buscas', nenhum: 'nenhuma busca' },
  edital: { varios: 'editais', nenhum: 'nenhum edital' },
};

function restantes(uso: Usados & { plano?: Plano }): { buscas: number; editais: number } {
  const max = LIMITES_PLANO[uso.plano ?? 'gratis'];
  return { buscas: Math.max(0, max.busca - uso.buscas), editais: Math.max(0, max.edital - uso.editais) };
}

const restam = (usados: number, maximo: number) => Math.min(maximo, Math.max(0, maximo - usados));

/** Bolinhas da faixa: `true` = ainda disponível (cheia), `false` = já usada (vazia). Sempre `maximo` bolinhas. */
export function bolinhas(usados: number, maximo: number): boolean[] {
  const sobra = Math.min(maximo, Math.max(0, maximo - usados));
  return Array.from({ length: maximo }, (_, i) => i < sobra);
}

/** Texto ao lado das bolinhas: "2 de 3" (Basic: "12 de 15"); zerado, "nenhuma busca" ou "nenhum edital". */
export function textoFaixa(tipo: TipoUso, usados: number, maximo: number = LIMITE_GRATIS[tipo]): string {
  const n = restam(usados, maximo);
  return n === 0 ? PALAVRAS[tipo].nenhum : `${n} de ${maximo}`;
}

/** O que o leitor de tela lê no lugar das bolinhas: "restam 2 de 3 buscas grátis hoje" (Basic, sem "grátis"). */
export function leituraFaixa(tipo: TipoUso, usados: number, maximo: number = LIMITE_GRATIS[tipo]): string {
  const n = restam(usados, maximo);
  const gratis = maximo === LIMITE_GRATIS[tipo] ? ' grátis' : '';
  if (n === 0) return `${PALAVRAS[tipo].nenhum}${gratis} restante hoje`;
  return `${n === 1 ? 'resta' : 'restam'} ${n} de ${maximo} ${PALAVRAS[tipo].varios}${gratis} hoje`;
}

export type TomSelo = 'normal' | 'atencao' | 'esgotado';

/** Laranja quando um dos dois zerou; amarelo quando falta 1 de qualquer um. */
export function tomSelo(uso: Usados & { plano?: Plano }): TomSelo {
  const r = restantes(uso);
  if (r.buscas === 0 || r.editais === 0) return 'esgotado';
  if (r.buscas === 1 || r.editais === 1) return 'atencao';
  return 'normal';
}

export function mensagemLimite(tipo: TipoUso, plano: Plano = 'gratis'): string {
  const max = LIMITES_PLANO[plano][tipo];
  if (plano === 'pro') return `Você chegou ao uso justo de hoje do plano Pro (${max} ${PALAVRAS[tipo].varios}). Volta amanhã às 0h.`;
  const de = plano === 'gratis' ? 'grátis' : `do plano ${NOME_PLANO[plano]}`;
  return tipo === 'busca' ? `Você usou as ${max} buscas ${de} de hoje.` : `Você abriu os ${max} editais ${de} de hoje.`;
}

export const CONVITE_PLANOS = 'Volta amanhã às 0h, ou conheça os planos.';

/** Corpo da resposta 402 (o `erro` em português aparece também onde a tela só mostra erros, como o botão Exportar). */
export function corpoLimite(tipo: TipoUso, usados: number, plano: Plano = 'gratis'): CorpoLimite {
  return {
    erro: plano === 'pro' ? mensagemLimite(tipo, plano) : `${mensagemLimite(tipo, plano)} ${CONVITE_PLANOS}`,
    codigo: CODIGO_LIMITE,
    limite: { tipo, usados, maximo: LIMITES_PLANO[plano][tipo] },
  };
}

/** Lê o sinal de limite de uma resposta; qualquer outra coisa (inclusive o 429 por hora) é null. */
export function lerLimite(status: number, corpo: unknown): Limite | null {
  if (status !== STATUS_LIMITE || typeof corpo !== 'object' || corpo === null) return null;
  const c = corpo as { codigo?: unknown; limite?: unknown };
  if (c.codigo !== CODIGO_LIMITE || typeof c.limite !== 'object' || c.limite === null) return null;
  const l = c.limite as { tipo?: unknown; usados?: unknown; maximo?: unknown };
  if ((l.tipo !== 'busca' && l.tipo !== 'edital') || typeof l.usados !== 'number' || typeof l.maximo !== 'number') return null;
  return { tipo: l.tipo, usados: l.usados, maximo: l.maximo };
}

/** Erro lançado no navegador quando a rota responde 402: a tela mostra o cartão dos planos, não um erro. */
export class LimiteAtingido extends Error {
  readonly limite: Limite;
  constructor(limite: Limite) {
    super(mensagemLimite(limite.tipo));
    this.name = 'LimiteAtingido';
    this.limite = limite;
  }
}
