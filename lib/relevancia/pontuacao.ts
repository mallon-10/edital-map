import type { Busca } from './termos';

/**
 * Pesos da relevância (0–100). Os mesmos números estão em public.pontuacao_busca (0011), que ordena a lista no banco;
 * a guarda em scripts/migracoes.test.ts falha se um lado mudar sem o outro.
 * Melhor tipo de acerto (não somam entre si) + expressão inteira + 5 por termo distinto além do primeiro (até 3), teto 100.
 */
export const PESOS = {
  digitadoObjeto: 60,
  digitadoItens: 35,
  relacionadoObjeto: 45,
  relacionadoItens: 25,
  frase: 15,
  porTermo: 5,
  termosExtras: 3,
  teto: 100,
} as const;

/** O que bateu num edital (colunas termos_objeto, termos_itens e frase de buscar_editais). `termosItens`: só nos itens. */
export type Acertos = { termosObjeto: string[]; termosItens: string[]; frase: boolean };
export type NivelRelevancia = 'Alta' | 'Média' | 'Baixa';
export type Relevancia = { pontos: number; nivel: NivelRelevancia; explicacao: string };

export const AVISO_RELEVANCIA =
  'Relevância mede o quanto o edital combina com a sua busca. Não indica chance de vencer nem garante que sua empresa pode participar.';

/** Só os termos que são da busca (o banco nunca devolve outros; aqui a regra fica explícita). */
function daBusca(a: Acertos, b: Busca) {
  const digitados = new Set(b.digitados);
  const relacionados = new Set(b.relacionados.map((r) => r.termo));
  const conhecido = (t: string) => digitados.has(t) || relacionados.has(t);
  return { digitados, relacionados, objeto: a.termosObjeto.filter(conhecido), itens: a.termosItens.filter(conhecido) };
}

/** Pontuação 0–100; null sem termo de busca ou quando nada da busca bateu (o card não mostra indicador). */
export function pontuar(a: Acertos, b: Busca): number | null {
  const { digitados, relacionados, objeto, itens } = daBusca(a, b);
  const distintos = new Set([...objeto, ...itens]).size;
  if (b.digitados.length === 0 || distintos === 0) return null;
  const tem = (lista: string[], conjunto: Set<string>) => lista.some((t) => conjunto.has(t));
  const base = Math.max(
    tem(objeto, digitados) ? PESOS.digitadoObjeto : 0,
    tem(itens, digitados) ? PESOS.digitadoItens : 0,
    tem(objeto, relacionados) ? PESOS.relacionadoObjeto : 0,
    tem(itens, relacionados) ? PESOS.relacionadoItens : 0,
  );
  const extras = PESOS.porTermo * Math.min(PESOS.termosExtras, Math.max(0, distintos - 1));
  return Math.min(PESOS.teto, base + (a.frase ? PESOS.frase : 0) + extras);
}

export function nivel(p: number): NivelRelevancia {
  if (p >= 70) return 'Alta';
  if (p >= 40) return 'Média';
  return 'Baixa';
}

const emLista = (ts: string[]) => (ts.length === 1 ? ts[0] : `${ts.slice(0, -1).join(', ')} e ${ts[ts.length - 1]}`);

/** Uma frase com o melhor acerto: digitado no objeto, relacionado no objeto, digitado nos itens, relacionado nos itens. */
export function explicar(a: Acertos, b: Busca): string | null {
  const { digitados, objeto, itens } = daBusca(a, b);
  const porTermo = new Map(b.relacionados.map((r) => [r.termo, r]));
  const relacionados = (lista: string[]) => {
    const rel = lista.filter((t) => porTermo.has(t));
    if (rel.length === 0) return null;
    // Só os do mesmo assunto do primeiro: a frase cita um assunto só.
    const assunto = porTermo.get(rel[0])!.assunto;
    const mesmos = rel.filter((t) => porTermo.get(t)!.assunto === assunto).slice(0, 2);
    return `${emLista(mesmos)}, ${mesmos.length === 1 ? 'relacionado' : 'relacionados'} a ${assunto}`;
  };
  const digObjeto = objeto.filter((t) => digitados.has(t)).slice(0, 3);
  if (digObjeto.length) return `Menciona ${emLista(digObjeto)} no objeto.`;
  const relObjeto = relacionados(objeto);
  if (relObjeto) return `Menciona ${relObjeto}, no objeto.`;
  const digItens = itens.filter((t) => digitados.has(t)).slice(0, 3);
  if (digItens.length) return `Menciona ${emLista(digItens)} nos itens.`;
  const relItens = relacionados(itens);
  return relItens ? `Menciona ${relItens}, nos itens.` : null;
}

export function relevancia(a: Acertos, b: Busca): Relevancia | null {
  const pontos = pontuar(a, b);
  if (pontos === null) return null;
  return { pontos, nivel: nivel(pontos), explicacao: explicar(a, b) ?? '' };
}
