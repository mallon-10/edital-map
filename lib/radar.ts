import { UFS_BRASIL, type Resultado } from './eventos';
import { limiteDeValor, MAX_PAGINA, MODALIDADES, ordemEfetiva, POR_PAGINA } from './filtros';
import type { IdPlano } from './planos';
import { chave, expandir, gruposDigitados, LIGACOES, normalizar, SIGLAS_TERMOS, type Busca } from './relevancia/termos';
import type { Ordem } from './tipos';

/**
 * Radar (perfil de interesse) de uma conta: regras puras de validação e da busca que alimenta o Meu Radar.
 * A busca é a mesma da Fase 2 (buscar_editais, 0011/0014): os produtos vão como termos digitados (OR), cada um com
 * seus relacionados (expandir, com teto menor: MAX_RELACIONADOS_RADAR), os excluídos tiram pelo objeto e os filtros
 * novos (municípios, valor máximo, ME/EPP) são da 0014. O dono do radar nunca está aqui: vem da sessão
 * (lib/servidor/sessao.ts → lib/servidor/conta.ts).
 */

export type Radar = {
  termos: string[];
  termosExcluir: string[];
  ufs: string[];
  /** Códigos IBGE (7 dígitos). Estados ou municípios, não os dois. */
  municipios: string[];
  /** Reais inteiros; null = sem limite (0 também vira null: o banco exige valor_max > 0). */
  valorMin: number | null;
  valorMax: number | null;
  modalidades: number[];
  soMeEpp: boolean;
};

export type ContagensRadar = { total: number; novas: number; prazoProximo: number };

export const LIMITES_RADAR = { termos: 10, excluir: 10, municipios: 50, tamanhoTermo: 60, tamanhoExcluir: 40, valorMaximo: 1e12 } as const;
/**
 * Teto do corpo cru, antes de qualquer trabalho (separar alternativas e tirar repetidos é quadrático): até 50 itens por
 * lista (municípios: 200, para o excesso ainda ganhar a mensagem "até 50") e 600 caracteres por item. Acima: formulário.
 */
export const ENTRADA_RADAR = { itens: 50, municipios: 200, caracteres: 600 } as const;
export const VISIVEIS_GRATIS = 5;
/**
 * Teto de relacionados do radar, somando todos os produtos (a busca avulsa usa 20). Cada relacionado é uma checagem
 * por edital no banco: com 5 produtos amplos, 20 relacionados levaram 805 ms e 12 levaram 520 ms (Task 4, C7).
 */
export const MAX_RELACIONADOS_RADAR = 12;

export const MENSAGENS_RADAR = {
  formulario: 'Formulário inválido.',
  semTermo: 'Informe pelo menos um produto ou serviço.',
  muitosTermos: 'Use até 10 produtos ou serviços.',
  termoLongo: 'Use até 60 caracteres em cada produto ou serviço.',
  termoCurto: 'Use uma palavra com 3 letras ou mais, ou uma sigla como EPI ou A4.',
  muitosExcluir: 'Use até 10 palavras para excluir.',
  excluirLongo: 'Use até 40 caracteres em cada palavra para excluir.',
  excluirCurto: 'Para excluir, use uma palavra com 3 letras ou mais, ou uma sigla como EPI ou A4.',
  uf: 'Estado inválido.',
  municipio: 'Município inválido.',
  muitosMunicipios: 'Escolha até 50 municípios.',
  local: 'Escolha estados ou municípios, não os dois.',
  valor: 'Confira os valores.',
  faixa: 'O valor mínimo não pode ser maior que o máximo.',
  modalidade: 'Modalidade inválida.',
  semEstado: 'Escolha pelo menos um estado.',
  semMunicipio: 'Escolha pelo menos um município.',
} as const;

const IDS_MODALIDADE: readonly number[] = MODALIDADES.map((m) => m.id);
const IBGE = /^\d{7}$/;
const falha = (erro: string): Resultado<never> => ({ ok: false, erro });

/**
 * Tem uma palavra que vale como busca: 3+ letras (sem ser de ligação), letra com número ("A4", "papel A4") ou sigla
 * conhecida (SIGLAS_TERMOS: "EPI", "GLP"). Só número não vale ("12", "32"): o banco busca por prefixo e acharia de
 * tudo, como "ti" sozinho. "ARLA 32" vale pela palavra "arla".
 */
export function palavraValida(t: string): boolean {
  return normalizar(t)
    .split(' ')
    // Sempre com letra: "123" também não vale.
    .some((p) => /[a-z]/.test(p) && ((p.length >= 3 && !LIGACOES.has(p)) || (p.length >= 2 && /\d/.test(p)) || SIGLAS_TERMOS.has(p)));
}

/** Lista de textos do corpo, ou null se não for (ou passar do teto de ENTRADA_RADAR). Ausente = vazia. */
function textos(v: unknown, maxItens: number = ENTRADA_RADAR.itens): string[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > maxItens) return null;
  return v.every((x) => typeof x === 'string' && x.length <= ENTRADA_RADAR.caracteres) ? (v as string[]) : null;
}

/** Número em reais (inteiro); ausente ou 0 = sem limite (null). */
function valor(v: unknown): number | null | 'invalido' {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > LIMITES_RADAR.valorMaximo) return 'invalido';
  return limiteDeValor(Math.round(v));
}

/** Corpo de POST /api/radar → Radar. Só os campos do radar passam (um user_id do navegador é ignorado). */
export function validarRadar(corpo: unknown): Resultado<Radar> {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) return falha(MENSAGENS_RADAR.formulario);
  const c = corpo as Record<string, unknown>;

  const brutos = textos(c.termos);
  if (!brutos) return falha(MENSAGENS_RADAR.formulario);
  const termos: string[] = [];
  for (const bruto of brutos) {
    for (const g of gruposDigitados(bruto)) {
      if (g.length > LIMITES_RADAR.tamanhoTermo) return falha(MENSAGENS_RADAR.termoLongo);
      if (!palavraValida(g)) return falha(MENSAGENS_RADAR.termoCurto);
      if (!termos.some((t) => chave(t) === chave(g))) termos.push(g);
      if (termos.length > LIMITES_RADAR.termos) return falha(MENSAGENS_RADAR.muitosTermos);
    }
  }
  if (termos.length === 0) return falha(MENSAGENS_RADAR.semTermo);

  const excluirBrutos = textos(c.termosExcluir);
  if (!excluirBrutos) return falha(MENSAGENS_RADAR.formulario);
  const termosExcluir: string[] = [];
  for (const bruto of excluirBrutos) {
    const e = bruto.trim().replace(/^-+/, '').replace(/\s+/g, ' ').toLowerCase();
    if (!e) continue;
    if (e.length > LIMITES_RADAR.tamanhoExcluir) return falha(MENSAGENS_RADAR.excluirLongo);
    if (!palavraValida(e)) return falha(MENSAGENS_RADAR.excluirCurto);
    if (!termosExcluir.some((t) => chave(t) === chave(e))) termosExcluir.push(e);
    if (termosExcluir.length > LIMITES_RADAR.excluir) return falha(MENSAGENS_RADAR.muitosExcluir);
  }

  const ufsBrutas = textos(c.ufs);
  if (!ufsBrutas) return falha(MENSAGENS_RADAR.formulario);
  const ufs = [...new Set(ufsBrutas.map((u) => u.trim().toUpperCase()))];
  if (ufs.some((u) => !UFS_BRASIL.includes(u))) return falha(MENSAGENS_RADAR.uf);
  ufs.sort();

  const municipiosBrutos = textos(c.municipios, ENTRADA_RADAR.municipios);
  if (!municipiosBrutos) return falha(MENSAGENS_RADAR.formulario);
  const municipios = [...new Set(municipiosBrutos.map((m) => m.trim()))];
  if (municipios.some((m) => !IBGE.test(m))) return falha(MENSAGENS_RADAR.municipio);
  if (municipios.length > LIMITES_RADAR.municipios) return falha(MENSAGENS_RADAR.muitosMunicipios);
  if (ufs.length > 0 && municipios.length > 0) return falha(MENSAGENS_RADAR.local);

  const valorMin = valor(c.valorMin);
  const valorMax = valor(c.valorMax);
  if (valorMin === 'invalido' || valorMax === 'invalido') return falha(MENSAGENS_RADAR.valor);
  if (valorMin !== null && valorMax !== null && valorMin > valorMax) return falha(MENSAGENS_RADAR.faixa);

  const modalidadesBrutas = c.modalidades ?? [];
  if (!Array.isArray(modalidadesBrutas) || modalidadesBrutas.length > ENTRADA_RADAR.itens) return falha(MENSAGENS_RADAR.formulario);
  const modalidades = [...new Set(modalidadesBrutas as unknown[])];
  if (modalidades.some((m) => typeof m !== 'number' || !IDS_MODALIDADE.includes(m))) return falha(MENSAGENS_RADAR.modalidade);

  return {
    ok: true,
    valor: {
      termos, termosExcluir, ufs, municipios, valorMin, valorMax,
      modalidades: (modalidades as number[]).sort((a, b) => a - b),
      soMeEpp: c.soMeEpp === true,
    },
  };
}

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const numero = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Linha de public.radares (numeric chega como texto) → Radar. */
export function radarDaLinha(l: Record<string, unknown>): Radar {
  return {
    termos: lista(l.termos),
    termosExcluir: lista(l.termos_excluir),
    ufs: lista(l.ufs),
    municipios: lista(l.municipios),
    valorMin: numero(l.valor_min),
    valorMax: numero(l.valor_max),
    modalidades: Array.isArray(l.modalidades) ? l.modalidades.map(Number) : [],
    soMeEpp: l.so_me_epp === true,
  };
}

/** Radar → colunas de public.radares (sem user_id: quem põe é lib/servidor/conta.ts, da sessão). Valor 0 → null. */
export function linhaDoRadar(r: Radar): Record<string, unknown> {
  return {
    termos: r.termos, termos_excluir: r.termosExcluir, ufs: r.ufs, municipios: r.municipios,
    valor_min: limiteDeValor(r.valorMin), valor_max: limiteDeValor(r.valorMax), modalidades: r.modalidades, so_me_epp: r.soMeEpp,
  };
}

/** A busca do radar no formato da Fase 2: produtos = digitados, relacionados de todos (até 12), excluídos. */
export function buscaDoRadar(r: Radar): Busca {
  return {
    positivo: r.termos.join(', '),
    digitados: r.termos,
    relacionados: expandir(r.termos, MAX_RELACIONADOS_RADAR),
    excluidos: r.termosExcluir,
  };
}

/** Filtros comuns a buscar_editais e radar_contagens (0014). Listas vazias, "não" e valor 0 viram nulo (sem filtro). */
export function filtrosDoRadar(r: Radar) {
  const b = buscaDoRadar(r);
  return {
    p_termos: b.digitados,
    p_relacionados: b.relacionados.map((t) => t.termo),
    p_excluir: b.excluidos.length ? b.excluidos : null,
    p_ufs: r.ufs.length ? r.ufs : null,
    p_ibges: r.municipios.length ? r.municipios : null,
    p_valor_min: limiteDeValor(r.valorMin),
    p_valor_max: limiteDeValor(r.valorMax),
    p_modalidades: r.modalidades.length ? r.modalidades : null,
    p_so_me_epp: r.soMeEpp ? true : null,
  };
}

/** Argumentos de buscar_editais para uma página do radar (página entre 1 e MAX_PAGINA). */
export function argumentosRadar(r: Radar, o: { ordem: Ordem | null; pagina: number; limite: number }) {
  const pagina = Number.isInteger(o.pagina) ? Math.min(Math.max(o.pagina, 1), MAX_PAGINA) : 1;
  return {
    ...filtrosDoRadar(r),
    p_ordem: ordemEfetiva(o.ordem, true),
    p_limite: o.limite,
    p_deslocamento: (pagina - 1) * POR_PAGINA,
  };
}

/** Grátis (e não interno): prévia dos 5 primeiros, sem páginas. Basic, Pro e interno: tudo, 20 por página. */
export function vistaDoRadar(plano: IdPlano, interno: boolean, pagina: number): { previa: boolean; pagina: number; limite: number } {
  if (plano === 'gratis' && !interno) return { previa: true, pagina: 1, limite: VISIVEIS_GRATIS };
  return { previa: false, pagina, limite: POR_PAGINA };
}

/** Desde quando contar "novas": a última visita; sem visita, as últimas 24 horas. */
export function desdeDaVisita(ultima: string | null, agora: Date): { desde: string; primeira: boolean } {
  if (ultima) return { desde: ultima, primeira: false };
  return { desde: new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString(), primeira: true };
}

// ── Campos digitados (onboarding e edição) ──────────────────────────────────────────────────────────────────────

/** Reais no formato brasileiro: milhar com ponto (opcional), centavos com vírgula (até 2 casas). */
const REAIS = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/**
 * "R$ 1.500.000,00" → 1500000 (reais inteiros); vazio ou 0 → null (sem limite); o resto → 'invalido'.
 * Só o formato brasileiro: "1000.50" é inválido (não vira 100050 nem 1000,50).
 */
export function lerValorReais(t: string): number | null | 'invalido' {
  const limpo = t.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!limpo) return null;
  const m = REAIS.exec(limpo);
  if (!m) return 'invalido';
  const n = Number(`${m[1].replace(/\./g, '')}.${m[2] ?? '0'}`);
  if (!Number.isFinite(n) || n > LIMITES_RADAR.valorMaximo) return 'invalido';
  return limiteDeValor(Math.round(n));
}

/**
 * Texto da busca de município (vai para o ilike de buscar_municipios): só letras, espaço, hífen e apóstrofo, de 2 a
 * 60 caracteres, espaços colapsados. Curingas do ilike (% _), barra invertida e o resto: null (nada vai ao banco).
 */
export function lerBuscaMunicipio(q: string | null): string | null {
  const t = (q ?? '').trim().replace(/\s+/g, ' ');
  return t.length >= 2 && t.length <= 60 && /^[\p{L}' -]+$/u.test(t) ? t : null;
}
