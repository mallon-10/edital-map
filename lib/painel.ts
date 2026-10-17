import type { PontoMapa } from './tipos';

export type MunicipioPainel = { nome: string; uf: string; ibge: string; qtd: number };
export type Painel = { porUf: Record<string, number>; topMunicipios: MunicipioPainel[]; valorTotal: number; ufs: number; total: number };

/** Números do painel a partir dos pontos do mapa que o navegador já tem. */
export function resumirPontos(pontos: PontoMapa[], top = 5): Painel {
  const porUf: Record<string, number> = {};
  let valorTotal = 0;
  let total = 0;
  for (const p of pontos) {
    porUf[p.uf] = (porUf[p.uf] ?? 0) + p.qtd;
    valorTotal += p.valor_total ?? 0;
    total += p.qtd;
  }
  const topMunicipios = [...pontos]
    .sort(
      (a, b) =>
        b.qtd - a.qtd ||
        a.nome.localeCompare(b.nome, 'pt-BR') ||
        a.uf.localeCompare(b.uf, 'pt-BR') ||
        a.codigo_ibge.localeCompare(b.codigo_ibge, 'pt-BR'),
    )
    .slice(0, top)
    .map((p) => ({ nome: p.nome, uf: p.uf, ibge: p.codigo_ibge, qtd: p.qtd }));
  return { porUf, topMunicipios, valorTotal, ufs: Object.keys(porUf).length, total };
}

export type Faixa = 0 | 1 | 2 | 3 | 4;
export type LimiteFaixa = { faixa: Faixa; de: number; ate: number };
export type Faixas = { faixaDe: (qtd: number) => Faixa; limites: LimiteFaixa[] };

/**
 * Faixas relativas à busca atual: os estados com editais, ordenados, viram 4 grupos de tamanho parecido
 * (0 = sem editais). Com até 4 valores diferentes, cada valor é uma faixa e o maior fica no tom mais escuro.
 * Valores iguais caem sempre na mesma faixa.
 */
export function faixasRelativas(porUf: Record<string, number>): Faixas {
  const valores = Object.values(porUf).filter((q) => q > 0).sort((a, b) => a - b);
  const distintos = [...new Set(valores)];
  let faixaDe: (qtd: number) => Faixa;
  if (distintos.length <= 4) {
    faixaDe = (qtd) => (qtd <= 0 ? 0 : ((4 - (distintos.length - 1 - distintos.indexOf(qtd))) as Faixa));
  } else {
    const cortes = [1, 2, 3].map((k) => valores[Math.floor((k * valores.length) / 4)]);
    faixaDe = (qtd) => (qtd <= 0 ? 0 : ((1 + cortes.filter((c) => qtd >= c).length) as Faixa));
  }
  const limites: LimiteFaixa[] = [];
  for (const v of distintos) {
    const faixa = faixaDe(v);
    const atual = limites.find((l) => l.faixa === faixa);
    if (atual) atual.ate = v;
    else limites.push({ faixa, de: v, ate: v });
  }
  return { faixaDe, limites };
}

/** Tons de azul da escala (o último é o azul-marinho da marca); índice = faixa. */
export const CORES_FAIXA: readonly string[] = ['#eef2f8', '#d5deeb', '#9db0cc', '#5b7aa6', '#0c2340'];
/** Expressão `match` do MapLibre que pinta cada estado com editais pela faixa relativa; os sem editais ficam no tom mais claro. */
export function coresDosEstados(porUf: Record<string, number>): unknown {
  const { faixaDe } = faixasRelativas(porUf);
  const pares = Object.keys(porUf)
    .filter((uf) => (porUf[uf] ?? 0) > 0)
    .sort()
    .flatMap((uf) => [uf, CORES_FAIXA[faixaDe(porUf[uf])]]);
  // `match` exige ao menos um rótulo: sem nenhum estado com editais, a cor é uma só.
  return pares.length > 0 ? ['match', ['get', 'uf'], ...pares, CORES_FAIXA[0]] : CORES_FAIXA[0];
}

/** Contorno branco comum entre os estados. */
const CONTORNO_COR = '#ffffff';
const CONTORNO_LARGURA = 1;
/** Estado sem resultado na busca: contorno azul mais grosso, para não sumir no fundo branco. */
export const CONTORNO_VAZIO_COR = CORES_FAIXA[2];
const CONTORNO_VAZIO_LARGURA = 1.5;

/**
 * Contorno dos estados: branco comum, e azul mais grosso em qualquer UF sem nenhum edital na busca atual.
 * `match` do MapLibre exige ao menos um rótulo: sem estado vazio devolve os valores simples.
 */
export function contornosDosEstados(porUf: Record<string, number>, ufs: readonly string[]): { cor: unknown; largura: unknown } {
  const vazias = ufs.filter((uf) => (porUf[uf] ?? 0) === 0);
  if (vazias.length === 0) return { cor: CONTORNO_COR, largura: CONTORNO_LARGURA };
  return {
    cor: ['match', ['get', 'uf'], vazias, CONTORNO_VAZIO_COR, CONTORNO_COR],
    largura: ['match', ['get', 'uf'], vazias, CONTORNO_VAZIO_LARGURA, CONTORNO_LARGURA],
  };
}
