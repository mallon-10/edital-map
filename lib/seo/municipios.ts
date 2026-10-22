/**
 * Páginas por município (/licitacoes/{uf}/{cidade}): toda cidade com edital aberto responde (sem 404 para a que oscila
 * em torno do mínimo); sitemap e links da UF só com pelo menos MINIMO_CIDADE editais, mais as capitais.
 */
export const MINIMO_CIDADE = 5;

/** Código IBGE das 27 capitais. */
export const CAPITAIS: ReadonlySet<string> = new Set([
  '1200401', '2704302', '1600303', '1302603', '2927408', '2304400', '5300108', '3205309', '5208707', '2111300', '5103403', '5002704',
  '3106200', '1501402', '2507507', '4106902', '2611606', '2211001', '3304557', '2408102', '4314902', '1100205', '1400100', '4205407',
  '3550308', '2800308', '1721000',
]);

export type CidadePagina = { ibge: string; nome: string; uf: string; slug: string; total: number; noSitemap: boolean };

export function slugCidade(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Cidades com página (todas com edital aberto), em ordem de UF e endereço. Nome repetido na mesma UF: as seguintes
 * ganham "-2", "-3"… pela ordem do código do IBGE (o endereço não muda com a contagem).
 */
export function escolherCidades(lista: ReadonlyArray<{ codigo_ibge: string; nome: string; uf: string; total: number }>): CidadePagina[] {
  const escolhidas = lista.filter((c) => c.total > 0).sort((a, b) => a.uf.localeCompare(b.uf) || a.codigo_ibge.localeCompare(b.codigo_ibge));
  const vistos = new Map<string, number>();
  const cidades = escolhidas.map((c) => {
    const base = slugCidade(c.nome);
    const chave = `${c.uf}/${base}`;
    const n = (vistos.get(chave) ?? 0) + 1;
    vistos.set(chave, n);
    return {
      ibge: c.codigo_ibge, nome: c.nome, uf: c.uf, slug: n === 1 ? base : `${base}-${n}`, total: c.total,
      noSitemap: c.total >= MINIMO_CIDADE || CAPITAIS.has(c.codigo_ibge),
    };
  });
  return cidades.sort((a, b) => a.uf.localeCompare(b.uf) || a.slug.localeCompare(b.slug));
}

export function cidadePorSlug(cidades: readonly CidadePagina[], uf: string, slug: string): CidadePagina | null {
  return cidades.find((c) => c.uf === uf && c.slug === slug) ?? null;
}
