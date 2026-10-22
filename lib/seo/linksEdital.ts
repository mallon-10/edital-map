import { modalidadePorNome } from './modalidades';
import type { CidadePagina } from './municipios';
import { ehPrefeitura, orgaoPorCnpj, type OrgaoPagina } from './orgaos';
import { caminhoDaPagina } from './textos';

/**
 * Links da ficha do edital para as páginas /licitacoes: a modalidade na UF e o órgão (a prefeitura vai para a página
 * da cidade). Sem página: null (texto puro, como antes). O edital precisa estar aberto (quem chama confere).
 */
export function linksDoEdital(
  e: { cnpj: string; orgao_nome: string; modalidade_nome: string | null; uf: string; codigo_ibge: string | null },
  orgaos: readonly OrgaoPagina[],
  cidades: readonly CidadePagina[],
): { modalidade: string | null; orgao: string | null } {
  const m = modalidadePorNome(e.modalidade_nome);
  const modalidade = m ? caminhoDaPagina({ assunto: null, modalidade: m, uf: e.uf }) : null;
  let orgao: string | null = null;
  if (ehPrefeitura(e.orgao_nome)) {
    const c = cidades.find((x) => x.ibge === e.codigo_ibge);
    orgao = c ? `/licitacoes/${c.uf.toLowerCase()}/${c.slug}` : null;
  } else {
    const o = orgaoPorCnpj(orgaos, e.cnpj);
    orgao = o ? caminhoDaPagina({ assunto: null, uf: o.uf, orgao: o }) : null;
  }
  return { modalidade, orgao };
}
