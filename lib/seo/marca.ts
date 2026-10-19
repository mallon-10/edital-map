import { NOMES_UF } from '../estados';
import { UFS_BRASIL } from '../eventos';
import { ASSUNTOS } from './assuntos';
import type { CidadePagina } from './municipios';
import { caminhoDaPagina } from './textos';
import { NOME_SITE, url } from './site';

/** Como as pessoas escrevem a marca na busca (o Google liga "editalmap" junto ao "Edital Map" por aqui). */
export const NOMES_ALTERNATIVOS = ['EditalMap', 'editalmap.com.br'];

/** Endereço fixo do logo em PNG (app/logo.png/route.tsx), para os dados estruturados. */
export const CAMINHO_LOGO = '/logo.png';

/** Site e empresa (schema.org) para a página inicial. `perfis`: LinkedIn, Instagram etc. da marca (sameAs). */
export function jsonLdMarca(perfis: readonly string[] = []): object {
  const org = {
    '@type': 'Organization',
    '@id': url('/#organizacao'),
    name: NOME_SITE,
    alternateName: NOMES_ALTERNATIVOS,
    url: url('/'),
    logo: url(CAMINHO_LOGO),
    description: 'Mapa das licitações abertas no Brasil, com os editais do PNCP atualizados a cada 3 horas.',
    ...(perfis.length ? { sameAs: [...perfis] } : {}),
  };
  const site = {
    '@type': 'WebSite',
    '@id': url('/#site'),
    name: NOME_SITE,
    alternateName: NOMES_ALTERNATIVOS,
    url: url('/'),
    inLanguage: 'pt-BR',
    publisher: { '@id': org['@id'] },
  };
  return { '@context': 'https://schema.org', '@graph': [site, org] };
}

export type Pergunta = { pergunta: string; resposta: string };

/** Perguntas frequentes da página /licitacoes (texto e FAQPage). */
export const PERGUNTAS_LICITACOES: readonly Pergunta[] = [
  {
    pergunta: 'O que são licitações abertas?',
    resposta:
      'São contratações publicadas pelos órgãos públicos no PNCP (Portal Nacional de Contratações Públicas) que ainda recebem propostas: o prazo de encerramento não passou e o edital não foi revogado nem anulado. Editais suspensos continuam na lista, com a etiqueta "Suspensa".',
  },
  {
    pergunta: 'Como participar de uma licitação?',
    resposta:
      'Leia o edital oficial: ele diz o que será comprado, os documentos de habilitação exigidos, o prazo e o sistema onde a disputa acontece (por exemplo, o Compras.gov.br ou o portal do município). Cadastre a empresa nesse sistema e envie a proposta até o horário de encerramento. O Edital Map ajuda a encontrar os editais, mas a participação é sempre pelo sistema indicado no edital.',
  },
  {
    pergunta: 'O que é pregão eletrônico?',
    resposta:
      'É a modalidade da Lei 14.133/2021 usada para comprar bens e serviços comuns, como EPI, uniformes, material de limpeza e informática. As empresas enviam propostas e disputam por lances pela internet, e vence o menor preço ou o maior desconto que cumpra as exigências do edital.',
  },
  {
    pergunta: 'Qual a diferença entre pregão, concorrência e dispensa?',
    resposta:
      'O pregão serve para bens e serviços comuns. A concorrência é usada em obras, serviços de engenharia e contratações especiais. A dispensa é a contratação direta que a lei permite em certos casos, como compras de valor baixo, muitas vezes com uma disputa eletrônica curta. O credenciamento cadastra todas as empresas que cumprem os requisitos.',
  },
  {
    pergunta: 'De onde vêm os editais do Edital Map?',
    resposta:
      'Do PNCP, onde os órgãos publicam as contratações da Lei 14.133. O Edital Map copia os editais abertos de todo o Brasil a cada 3 horas, nas modalidades pregão, concorrência, dispensa e credenciamento, e mostra cada um no mapa pela sede do órgão comprador.',
  },
  {
    pergunta: 'Quanto custa usar o Edital Map?',
    resposta:
      'O plano grátis tem 3 buscas e 3 editais por dia. O Pro custa R$ 37,90 por mês (ou R$ 349,90 por ano) e libera buscas sem limite, alertas por e-mail e o resumo semanal do seu segmento.',
  },
];

export function jsonLdPerguntas(perguntas: readonly Pergunta[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: perguntas.map((p) => ({ '@type': 'Question', name: p.pergunta, acceptedAnswer: { '@type': 'Answer', text: p.resposta } })),
  };
}

type Link = { nome: string; caminho: string };

const maiuscula = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** Links da página inicial para as páginas de licitações: assuntos, as 27 UFs (por nome) e as cidades com mais editais. */
export function linksDaInicio(cidades: readonly CidadePagina[], maxCidades = 24): { assuntos: Link[]; estados: Link[]; cidades: Link[] } {
  return {
    assuntos: ASSUNTOS.map((a) => ({ nome: maiuscula(a.nome), caminho: caminhoDaPagina({ assunto: a, uf: null }) })),
    estados: [...UFS_BRASIL]
      .sort((a, b) => NOMES_UF[a].localeCompare(NOMES_UF[b], 'pt-BR'))
      .map((uf) => ({ nome: NOMES_UF[uf], caminho: caminhoDaPagina({ assunto: null, uf }) })),
    cidades: [...cidades]
      .sort((a, b) => b.total - a.total)
      .slice(0, maxCidades)
      .map((c) => ({ nome: `${c.nome} (${c.uf})`, caminho: `/licitacoes/${c.uf.toLowerCase()}/${c.slug}` })),
  };
}

/** Rodapé de todas as páginas. */
export const LINKS_RODAPE: readonly Link[] = [
  { nome: 'Licitações abertas', caminho: '/licitacoes' },
  { nome: 'Buscar pelo CNPJ', caminho: '/cnpj' },
  { nome: 'Alertas por e-mail', caminho: '/alertas' },
  { nome: 'Planos', caminho: '/planos' },
  { nome: 'Sobre', caminho: '/sobre' },
];
