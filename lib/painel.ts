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
    .sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'))
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
export const COR_SEM_COBERTURA = '#ebe6d9';

/** Expressão `match` do MapLibre que pinta cada estado coberto pela faixa e os outros em cinza. */
export function coresDosEstados(porUf: Record<string, number>, cobertas: readonly string[]): unknown[] {
  const pares = cobertas.flatMap((uf) => [uf, CORES_FAIXA[faixaDaUf(porUf[uf] ?? 0)]]);
  return ['match', ['get', 'uf'], ...pares, COR_SEM_COBERTURA];
}
