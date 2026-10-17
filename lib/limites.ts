import type { FiltrosBusca, ResultadoBusca } from './tipos';

/** Limites do plano grátis por dia (calendário de Brasília), por navegador. */
export const LIMITE_GRATIS = { busca: 3, edital: 3 } as const;
export type TipoUso = keyof typeof LIMITE_GRATIS;

/** Uso do dia que o selo mostra. `interno`: navegador do dono, sem limite e sem selo. */
export type UsoHoje = { interno: boolean; buscas: number; editais: number };
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
 * valor, modalidades (em ordem), órgão e raio. Prazo (`dias`) e página (`deslocamento`) não entram; com raio a UF não
 * filtra (o raio atravessa a divisa), então também não entra. `null` = busca vazia (página inicial sem nada), que não conta.
 */
export function combinacaoBusca(f: FiltrosBusca): string | null {
  const q = f.q ? semAcento(f.q).toLowerCase().replace(/\s+/g, ' ').trim() || null : null;
  const uf = f.raio ? null : f.uf;
  const modalidades = f.modalidades?.length ? [...f.modalidades].sort((a, b) => a - b) : null;
  const partes = [q, uf, f.ibge, f.valorMin, modalidades, f.orgao, f.raio];
  return partes.every((p) => p === null) ? null : JSON.stringify(partes);
}

const PALAVRAS: Record<TipoUso, { um: string; varios: string; nenhum: string }> = {
  busca: { um: 'busca', varios: 'buscas', nenhum: 'nenhuma busca' },
  edital: { um: 'edital', varios: 'editais', nenhum: 'nenhum edital' },
};

function quantos(tipo: TipoUso, n: number): string {
  const p = PALAVRAS[tipo];
  return n <= 0 ? p.nenhum : `${n} ${n === 1 ? p.um : p.varios}`;
}

function restantes(uso: Usados): { buscas: number; editais: number } {
  return { buscas: Math.max(0, LIMITE_GRATIS.busca - uso.buscas), editais: Math.max(0, LIMITE_GRATIS.edital - uso.editais) };
}

/** "Grátis · restam 2 buscas e 1 edital hoje"; com os dois zerados, "Grátis · nenhuma busca e nenhum edital hoje". */
export function textoSelo(uso: Usados): string {
  const r = restantes(uso);
  if (r.buscas === 0 && r.editais === 0) return 'Grátis · nenhuma busca e nenhum edital hoje';
  return `Grátis · restam ${quantos('busca', r.buscas)} e ${quantos('edital', r.editais)} hoje`;
}

/** Selo do celular: "2 buscas · 1 edital". */
export function textoSeloCompacto(uso: Usados): string {
  const r = restantes(uso);
  return `${quantos('busca', r.buscas)} · ${quantos('edital', r.editais)}`;
}

export type TomSelo = 'normal' | 'atencao' | 'esgotado';

/** Laranja quando um dos dois zerou; amarelo quando falta 1 de qualquer um. */
export function tomSelo(uso: Usados): TomSelo {
  const r = restantes(uso);
  if (r.buscas === 0 || r.editais === 0) return 'esgotado';
  if (r.buscas === 1 || r.editais === 1) return 'atencao';
  return 'normal';
}

export function mensagemLimite(tipo: TipoUso): string {
  return tipo === 'busca'
    ? `Você usou as ${LIMITE_GRATIS.busca} buscas grátis de hoje.`
    : `Você abriu os ${LIMITE_GRATIS.edital} editais grátis de hoje.`;
}

export const CONVITE_PLANOS = 'Volta amanhã às 0h, ou conheça os planos.';

/** Corpo da resposta 402 (o `erro` em português aparece também onde a tela só mostra erros, como o botão Exportar). */
export function corpoLimite(tipo: TipoUso, usados: number): CorpoLimite {
  return {
    erro: `${mensagemLimite(tipo)} ${CONVITE_PLANOS}`,
    codigo: CODIGO_LIMITE,
    limite: { tipo, usados, maximo: LIMITE_GRATIS[tipo] },
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
