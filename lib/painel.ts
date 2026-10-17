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
