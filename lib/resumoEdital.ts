import { data, hora, moeda } from './formato';
import { modalidadeCurta } from './participacao';
import { assunto, nomeProprio } from './texto';
import type { Edital } from './tipos';

export const NAO_INFORMADO = 'não informado pelo órgão';

/** Começos de nome de órgão no feminino (sem acento, minúsculos). Fora das listas e sem final feminino claro, a frase usa "de". */
const FEMININOS =
  /^(prefeitura|secretaria|universidade|fundacao|camara|empresa|companhia|policia|assembleia|agencia|defensoria|procuradoria|superintendencia|diretoria|autarquia|controladoria|coordenadoria|escola|faculdade|caixa|base|marinha|forca|junta|justica|ouvidoria|gerencia|unidade|subprefeitura|corregedoria|comissao|associacao|administracao|cooperativa|delegacia|santa|penitenciaria|casa|camara|colonia|academia|organizacao|federacao|confederacao|rede|ordem|liga|sociedade|entidade|cidade)(?=\s|$)/;

/** Começos no masculino (sem acento, minúsculos). Fora das duas listas e sem final feminino claro, a frase usa "de". */
const MASCULINOS =
  /^(municipio|estado|fundo|instituto|hospital|conselho|tribunal|ministerio|departamento|servico|centro|consorcio|batalhao|comando|governo|distrito|corpo|exercito|gabinete|senado|sindicato|sesc|senai|senac|tribunal|orgao|detran|legislativo|parlamento|condominio|clube|colegio|laboratorio|complexo|nucleo|polo|porto|museu|teatro|parque|quartel|regimento|grupamento|forum|ministerio)(?=\s|$)/;

/** Primeira palavra com final claramente feminino (-ção, -são, -dade). */
const FINAL_FEMININO = /(cao|sao|dade)$/;

/** "do Município de Joinville", "da Prefeitura Municipal de Itajaí" (nome já limpo por nomeProprio). */
export function comPreposicao(orgao: string): string {
  const base = orgao.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const primeira = base.split(/\s/)[0] ?? '';
  if (FEMININOS.test(base) || FINAL_FEMININO.test(primeira)) return `da ${orgao}`;
  if (MASCULINOS.test(base)) return `do ${orgao}`;
  return `de ${orgao}`; // incerto: forma neutra, sem chutar o gênero
}

/** Primeira letra minúscula para caber no meio da frase, menos quando a primeira palavra é sigla ("EPIs", "UBS"). */
export function minusculaInicial(t: string): string {
  const primeira = t.split(/\s/)[0] ?? '';
  if ((primeira.match(/\p{Lu}/gu) ?? []).length >= 2) return t;
  return t.replace(/^\p{Lu}/u, (l) => l.toLocaleLowerCase('pt-BR'));
}

/**
 * Resumo da oportunidade em linguagem simples, só com campos que existem (sem IA, sem inventar):
 * assunto, órgão e local; modalidade (a frase sai sem ela); valor e prazo (ou "não informado pelo órgão").
 */
export function resumoOportunidade(e: Edital): string[] {
  const local = e.municipio_nome ? `${e.municipio_nome}/${e.uf}` : e.uf;
  const frases = [`Este edital trata de ${minusculaInicial(assunto(e.objeto).titulo)}, ${comPreposicao(nomeProprio(e.orgao_nome))} (${local}).`];
  const modalidade = modalidadeCurta(e.modalidade_nome);
  if (modalidade) frases.push(`Modalidade: ${modalidade}.`);
  frases.push(`Valor estimado: ${moeda(e.valor_estimado) ?? NAO_INFORMADO}.`);
  frases.push(
    e.encerramento_em
      ? `As propostas podem ser enviadas até ${data(e.encerramento_em)}, às ${hora(e.encerramento_em)}.`
      : `Prazo para as propostas: ${NAO_INFORMADO}.`,
  );
  return frases;
}
