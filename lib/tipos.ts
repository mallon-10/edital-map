export type Cidade = { ibge: string; nome: string; uf: string };

export type FiltrosBusca = {
  q: string | null;
  uf: string | null;
  ibge: string | null;
  dias: number | null;
  deslocamento: number;
};

export type EditalResumo = {
  id: string;
  slug: string;
  objeto: string;
  orgao_nome: string;
  municipio_nome: string | null;
  uf: string;
  codigo_ibge: string | null;
  valor_estimado: number | null;
  encerramento_em: string;
  modalidade_nome: string | null;
  onde: 'objeto' | 'itens';
  item_trecho: string | null;
};

export type ResultadoBusca = { total: number; editais: EditalResumo[] };

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
  srp: boolean;
  valor_estimado: number | null;
  publicada_em: string | null;
  encerramento_em: string | null;
  link_origem: string | null;
};

export type ItemEdital = {
  numero: number;
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  valor_unitario_estimado: number | null;
  valor_total_estimado: number | null;
  sigiloso: boolean;
};

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
