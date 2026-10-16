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

/** Faixas da legenda: 0 = sem editais, 1 = 1–19, 2 = 20–49, 3 = 50–199, 4 = 200+. */
export function faixaDaUf(qtd: number): 0 | 1 | 2 | 3 | 4 {
  if (qtd >= 200) return 4;
  if (qtd >= 50) return 3;
  if (qtd >= 20) return 2;
  if (qtd >= 1) return 1;
  return 0;
}

/** Tons de azul da escala (o último é o azul-marinho da marca); índice = faixa. */
export const CORES_FAIXA: readonly string[] = ['#eef2f8', '#d5deeb', '#9db0cc', '#5b7aa6', '#0c2340'];
/** Expressão `match` do MapLibre que pinta cada estado com editais pela faixa; os sem editais ficam no tom mais claro. */
export function coresDosEstados(porUf: Record<string, number>): unknown {
  const pares = Object.keys(porUf)
    .filter((uf) => (porUf[uf] ?? 0) > 0)
    .sort()
    .flatMap((uf) => [uf, CORES_FAIXA[faixaDaUf(porUf[uf])]]);
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
