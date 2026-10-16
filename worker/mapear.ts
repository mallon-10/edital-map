import { deBrasilia } from './datas';
import { RETENCAO_DIAS } from './config';
import type { ContratacaoPncp, ItemPncp } from './pncp/esquemas';

export type LinhaContratacao = {
  id: string;
  cnpj: string;
  ano: number;
  sequencial: number;
  objeto: string;
  info_complementar: string | null;
  orgao_nome: string;
  unidade_nome: string | null;
  esfera: string | null;
  codigo_ibge: string | null;
  uf: string;
  municipio_nome: string | null;
  modalidade_id: number;
  modalidade_nome: string | null;
  situacao_id: number | null;
  situacao_nome: string | null;
  srp: boolean;
  valor_estimado: number | null;
  valor_homologado: number | null;
  publicada_em: string | null;
  abertura_em: string | null;
  encerramento_em: string | null;
  link_origem: string | null;
  atualizada_pncp_em: string;
};

export type LinhaItem = {
  contratacao_id: string;
  numero: number;
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  valor_unitario_estimado: number | null;
  valor_total_estimado: number | null;
  material_ou_servico: string | null;
  sigiloso: boolean;
  tem_resultado: boolean;
  beneficio_id: number | null;
  beneficio_nome: string | null;
  criterio_julgamento: string | null;
};

export type ChaveCompra = { id: string; cnpj: string; ano: number; sequencial: number };

function texto(valor: string | null | undefined): string | null {
  const t = valor?.trim();
  return t ? t : null;
}

export function contratacaoParaLinha(c: ContratacaoPncp): LinhaContratacao {
  return {
    id: c.numeroControlePNCP,
    cnpj: c.orgaoEntidade.cnpj,
    ano: c.anoCompra,
    sequencial: c.sequencialCompra,
    objeto: c.objetoCompra.trim(),
    info_complementar: texto(c.informacaoComplementar),
    orgao_nome: c.orgaoEntidade.razaoSocial,
    unidade_nome: texto(c.unidadeOrgao.nomeUnidade),
    esfera: texto(c.orgaoEntidade.esferaId),
    codigo_ibge: c.unidadeOrgao.codigoIbge == null ? null : texto(String(c.unidadeOrgao.codigoIbge)),
    uf: c.unidadeOrgao.ufSigla.toUpperCase(),
    municipio_nome: texto(c.unidadeOrgao.municipioNome),
    modalidade_id: c.modalidadeId,
    modalidade_nome: texto(c.modalidadeNome),
    situacao_id: c.situacaoCompraId ?? null,
    situacao_nome: texto(c.situacaoCompraNome),
    srp: c.srp ?? false,
    valor_estimado: c.valorTotalEstimado ?? null,
    valor_homologado: c.valorTotalHomologado ?? null,
    publicada_em: deBrasilia(c.dataPublicacaoPncp),
    abertura_em: deBrasilia(c.dataAberturaProposta),
    encerramento_em: deBrasilia(c.dataEncerramentoProposta),
    link_origem: texto(c.linkSistemaOrigem),
    atualizada_pncp_em: deBrasilia(c.dataAtualizacaoGlobal?.trim() || c.dataAtualizacao) as string,
  };
}

export function itemParaLinha(i: ItemPncp, contratacaoId: string): LinhaItem {
  return {
    contratacao_id: contratacaoId,
    numero: i.numeroItem,
    descricao: i.descricao.trim(),
    quantidade: i.quantidade ?? null,
    unidade: texto(i.unidadeMedida),
    valor_unitario_estimado: i.valorUnitarioEstimado ?? null,
    valor_total_estimado: i.valorTotal ?? null,
    material_ou_servico: texto(i.materialOuServico),
    sigiloso: i.orcamentoSigiloso ?? false,
    tem_resultado: i.temResultado ?? false,
    beneficio_id: i.tipoBeneficio ?? null,
    beneficio_nome: texto(i.tipoBeneficioNome),
    criterio_julgamento: texto(i.criterioJulgamentoNome),
  };
}

export function chaveDaLinha(l: Pick<LinhaContratacao, 'id' | 'cnpj' | 'ano' | 'sequencial'>): ChaveCompra {
  return { id: l.id, cnpj: l.cnpj, ano: l.ano, sequencial: l.sequencial };
}

export function estaAberta(l: Pick<LinhaContratacao, 'encerramento_em'>, agora: Date): boolean {
  return l.encerramento_em !== null && Date.parse(l.encerramento_em) > agora.getTime();
}

/** Fora da retenção = sem prazo ou encerrada há mais de RETENCAO_DIAS (a mesma regra de aplicar_retencao na 0006). */
export function foraDaRetencao(l: Pick<LinhaContratacao, 'encerramento_em'>, agora: Date): boolean {
  return l.encerramento_em === null || Date.parse(l.encerramento_em) < agora.getTime() - RETENCAO_DIAS * 24 * 3600 * 1000;
}

export function linkDoPortal(c: Pick<ChaveCompra, 'cnpj' | 'ano' | 'sequencial'>): string {
  return `https://pncp.gov.br/app/editais/${c.cnpj}/${c.ano}/${c.sequencial}`;
}
