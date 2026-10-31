import type { Relevancia } from './relevancia/pontuacao';
export type Cidade = { ibge: string; nome: string; uf: string };

/** Ordem da lista (buscar_editais, 0011). Relevância só faz sentido com termo (sem termo vale "prazo"). */
export type Ordem = 'relevancia' | 'recentes' | 'prazo' | 'maior_valor' | 'menor_valor';

export type FiltrosBusca = {
  q: string | null;
  uf: string | null;
  ibge: string | null;
  dias: number | null;
  /** Página da lista (1..MAX_PAGINA), de POR_PAGINA editais. Mudar de página não conta como outra busca. */
  pagina: number;
  /** Ordem pedida; null = a padrão (relevância com termo, menor prazo sem termo). Não conta como outra busca. */
  ordem: Ordem | null;
  valorMin: number | null;
  modalidades: number[] | null;
  /** CNPJ do órgão comprador (contratacoes.cnpj). */
  orgao: string | null;
  /** Raio em km a partir da sede do município `ibge` (50, 100 ou 200); só existe com `ibge`. */
  raio: number | null;
};

/** Órgão escolhido no filtro (o nome é só para o chip). */
export type Orgao = { cnpj: string; nome: string };

/** Estado dos filtros na tela inicial (o navegador monta a URL da API com `paraParametros`). */
export type FiltrosTela = {
  q: string;
  uf: string;
  cidade: Cidade | null;
  valorMin: number | null;
  modalidades: number[];
  seteDias: boolean;
  orgao: Orgao | null;
  /** Raio em km a partir da cidade; sem cidade é sempre null (`normalizarTela`). */
  raio: number | null;
};

export type EditalResumo = {
  id: string;
  slug: string;
  objeto: string;
  orgao_nome: string;
  unidade_nome: string | null;
  municipio_nome: string | null;
  uf: string;
  codigo_ibge: string | null;
  valor_estimado: number | null;
  encerramento_em: string;
  publicada_em: string | null;
  modalidade_nome: string | null;
  srp: boolean;
  onde: 'objeto' | 'itens';
  /** Situação oficial no PNCP (4 = Suspensa: o card mostra a etiqueta). */
  situacao_id: number | null;
  /** Só com termo de busca: pontuação 0–100, nível e explicação (lib/relevancia/pontuacao.ts). */
  relevancia: Relevancia | null;
  /** Termos (digitados e relacionados) que bateram no objeto: destaque do título. */
  destaques: string[];
};

export type ResultadoBusca = {
  total: number;
  editais: EditalResumo[];
  /** Grátis pesquisando um assunto: editais que ficaram de fora, atrás do cadeado (lib/limiteBusca.ts). */
  bloqueados?: number;
};

export type PontoMapa = {
  codigo_ibge: string;
  nome: string;
  uf: string;
  lat: number;
  lng: number;
  qtd: number;
  valor_total: number | null;
  prazo_mais_proximo: string;
};

export type Edital = {
  id: string;
  slug: string;
  cnpj: string;
  ano: number;
  sequencial: number;
  objeto: string;
  info_complementar: string | null;
  orgao_nome: string;
  unidade_nome: string | null;
  municipio_nome: string | null;
  uf: string;
  codigo_ibge: string | null;
  modalidade_nome: string | null;
  situacao_nome: string | null;
  situacao_id: number | null;
  esfera: string | null;
  srp: boolean;
  valor_estimado: number | null;
  publicada_em: string | null;
  abertura_em: string | null;
  encerramento_em: string | null;
  link_origem: string | null;
  /** Última alteração da contratação no PNCP. */
  atualizada_pncp_em: string | null;
};

export type ItemEdital = {
  numero: number;
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  valor_unitario_estimado: number | null;
  valor_total_estimado: number | null;
  sigiloso: boolean;
  material_ou_servico: string | null;
  beneficio_id: number | null;
  beneficio_nome: string | null;
  criterio_julgamento: string | null;
};

/** Arquivo publicado no PNCP (edital, termo de referência, anexos), com o link de download. */
export type ArquivoEdital = { titulo: string; tipo: string; url: string };

export type ResumoItens = {
  total: number;
  materiais: number;
  servicos: number;
  /** Itens que têm a informação de benefício (preenchida pela releitura do worker). */
  comBeneficio: number;
  /** Participação exclusiva para ME/EPP (tipoBeneficio 1). */
  exclusivos: number;
  /** Cota reservada para ME/EPP (tipoBeneficio 3). */
  cota: number;
  criterios: string[];
};

/** Card de "Editais parecidos abertos" (colunas da função relacionados). */
export type EditalRelacionado = Pick<
  EditalResumo,
  'id' | 'slug' | 'objeto' | 'orgao_nome' | 'municipio_nome' | 'uf' | 'valor_estimado' | 'encerramento_em' | 'publicada_em' | 'modalidade_nome' | 'srp'
>;

/** Órgão com editais abertos, na busca do chip Órgão. */
export type OrgaoAberto = Orgao & { uf: string; qtd: number };

/** Linha da planilha: o card da lista + o link de origem (para o link do edital). */
export type EditalExportado = EditalResumo & { link_origem: string | null };
