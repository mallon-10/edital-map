/**
 * Modalidades das páginas /licitacoes/{modalidade}[/{uf}]: as cinco que o espelho copia (6, 7, 4, 8, 12), com um texto
 * curto escrito à mão pela Lei 14.133/2021 (conteúdo próprio da página, sem promessa jurídica).
 */
/** `saibaMais`: guia ou termo do glossário que explica a modalidade (link "Entenda como funciona"). */
export type Modalidade = { slug: string; id: number; nome: string; explicacao: string; saibaMais: string };

const CONFIRA = 'Confira sempre as regras no edital.';

export const MODALIDADES: readonly Modalidade[] = [
  {
    slug: 'pregao-eletronico',
    id: 6,
    saibaMais: '/guias/pregao-eletronico',
    nome: 'pregão eletrônico',
    explicacao:
      'O pregão é a modalidade obrigatória para comprar bens e serviços comuns (Lei 14.133/2021, art. 6º, XLI). Na forma eletrônica, a disputa acontece pela internet, com lances sucessivos, e vence o menor preço ou o maior desconto. Pode participar qualquer empresa que cumpra a habilitação do edital; microempresas e empresas de pequeno porte têm tratamento favorecido. ' +
      CONFIRA,
  },
  {
    slug: 'pregao-presencial',
    id: 7,
    saibaMais: '/guias/pregao-eletronico',
    nome: 'pregão presencial',
    explicacao:
      'É o mesmo pregão, com a sessão de lances feita no local indicado pelo órgão. A Lei 14.133/2021 prefere a forma eletrônica e só admite a presencial com justificativa (art. 17, § 2º), por isso há bem menos editais assim. ' +
      CONFIRA,
  },
  {
    slug: 'concorrencia',
    id: 4,
    saibaMais: '/guias/modalidades-de-licitacao',
    nome: 'concorrência',
    explicacao:
      'A concorrência serve para bens e serviços especiais e para obras e serviços de engenharia (Lei 14.133/2021, art. 6º, XXXVIII). O critério pode ser menor preço, melhor técnica, técnica e preço, maior retorno econômico ou maior desconto, e a habilitação costuma pedir mais documentos. ' +
      CONFIRA,
  },
  {
    slug: 'dispensa',
    id: 8,
    saibaMais: '/guias/dispensa-de-licitacao',
    nome: 'dispensa de licitação',
    explicacao:
      'Na dispensa, o órgão contrata sem uma licitação completa, nos casos do art. 75 da Lei 14.133/2021, como compras de pequeno valor e emergências. Muitas são dispensas eletrônicas, com aviso público por pelo menos 3 dias úteis e disputa rápida por lances. ' +
      CONFIRA,
  },
  {
    slug: 'credenciamento',
    id: 12,
    saibaMais: '/glossario/credenciamento',
    nome: 'credenciamento',
    explicacao:
      'No credenciamento, o órgão chama todas as empresas ou profissionais interessados que cumpram os requisitos, sem disputa de preço (Lei 14.133/2021, art. 79). É comum em serviços de saúde e quando muitos fornecedores podem atender ao mesmo tempo. ' +
      CONFIRA,
  },
];

const POR_SLUG = new Map(MODALIDADES.map((m) => [m.slug, m]));

export function modalidadePorSlug(slug: string): Modalidade | null {
  return POR_SLUG.get(slug) ?? null;
}

const semAcento = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Nome do PNCP ('Pregão - Eletrônico', 'Concorrência - Presencial', 'Dispensa'…) → modalidade da página; outras = null. */
export function modalidadePorNome(nome: string | null): Modalidade | null {
  if (!nome) return null;
  const n = semAcento(nome);
  if (n.startsWith('pregao')) return modalidadePorSlug(n.includes('presencial') ? 'pregao-presencial' : 'pregao-eletronico');
  if (n.startsWith('concorrencia')) return modalidadePorSlug('concorrencia');
  if (n.startsWith('dispensa')) return modalidadePorSlug('dispensa');
  if (n.startsWith('credenciamento')) return modalidadePorSlug('credenciamento');
  return null;
}
