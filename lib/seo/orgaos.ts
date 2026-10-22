import { nomeProprio } from '../texto';
import { type CidadePagina, slugCidade } from './municipios';

/**
 * Páginas por órgão (/licitacoes/orgao/{slug}): todo órgão com edital aberto responde, menos a prefeitura (coberta pela
 * página da cidade); sitemap e links só com pelo menos MINIMO_ORGAO editais. O CNPJ no fim do endereço o mantém estável.
 */
export const MINIMO_ORGAO = 10;

const semAcento = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().trim();

export function ehPrefeitura(nome: string): boolean {
  return /^(MUNICIPIO DE|PREFEITURA)\b/.test(semAcento(nome));
}

/** Nomes que só fazem sentido com a cidade ("Fundo Municipal de Saúde" existe em milhares de cidades). */
const GENERICOS = /^(FUNDO MUNICIPAL|SECRETARIA MUNICIPAL|CAMARA MUNICIPAL)\b/;

export function slugOrgao(nome: string, cnpj: string): string {
  return `${slugCidade(nome)}-${cnpj.toLowerCase()}`;
}

/** Os 14 caracteres do CNPJ no fim do endereço (o novo CNPJ tem letras nos 12 primeiros). */
export function cnpjDoSlug(slug: string): string | null {
  const m = /(?:^|-)([0-9a-z]{12}\d{2})$/.exec(slug);
  return m ? m[1].toUpperCase() : null;
}

export function nomeDoOrgao(nome: string, cidade: string | null, uf: string): string {
  const limpo = nomeProprio(nome);
  return cidade && GENERICOS.test(semAcento(nome)) ? `${limpo} (${cidade}/${uf})` : limpo;
}

export type OrgaoPagina = {
  cnpj: string; nome: string; slug: string; uf: string; ibge: string | null; cidadeNome: string | null; cidadeSlug: string | null;
  total: number; noSitemap: boolean;
};

/** Órgãos com página, mais editais primeiro. A cidade entra quando ela tem página (lib/seo/municipios.ts). */
export function escolherOrgaos(
  lista: ReadonlyArray<{ cnpj: string; nome: string; uf: string; codigo_ibge: string | null; total: number }>,
  cidades: readonly CidadePagina[],
): OrgaoPagina[] {
  const porIbge = new Map(cidades.map((c) => [c.ibge, c]));
  return lista
    .filter((o) => o.total > 0 && o.nome.trim() !== '' && !ehPrefeitura(o.nome))
    .map((o) => {
      const cidade = o.codigo_ibge ? (porIbge.get(o.codigo_ibge) ?? null) : null;
      const nome = nomeDoOrgao(o.nome, cidade?.nome ?? null, o.uf);
      return {
        cnpj: o.cnpj, nome, slug: slugOrgao(nome.replace(/\s*\([^)]*\)$/, ''), o.cnpj), uf: o.uf, ibge: o.codigo_ibge,
        cidadeNome: cidade?.nome ?? null, cidadeSlug: cidade?.slug ?? null, total: o.total, noSitemap: o.total >= MINIMO_ORGAO,
      };
    })
    .sort((a, b) => b.total - a.total || a.cnpj.localeCompare(b.cnpj));
}

export function orgaoPorCnpj(orgaos: readonly OrgaoPagina[], cnpj: string): OrgaoPagina | null {
  return orgaos.find((o) => o.cnpj === cnpj) ?? null;
}
