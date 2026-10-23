/**
 * Conteúdo editorial do site (guias e glossário). Os textos aceitam links na forma `[texto](/caminho)` ou
 * `[texto](https://site-oficial)`; lib/guias/texto.ts converte e lib/guias/validar.ts confere (testes em lib/guias).
 */
export type Fonte = { nome: string; url: string };

export type Bloco =
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'passos'; itens: string[] };

export type Secao = { titulo: string; blocos: Bloco[] };

export type Pergunta = { pergunta: string; resposta: string };

export type Guia = {
  slug: string;
  /** H1 e título da aba. */
  titulo: string;
  /** Meta description, até 160 caracteres. */
  descricao: string;
  /** Resposta direta do primeiro parágrafo, 40 a 60 palavras. */
  resposta: string;
  /** aaaa-mm-dd. */
  revisadoEm: string;
  secoes: Secao[];
  /** Páginas /licitacoes ligadas ao tema ("Editais abertos agora"). */
  editais: string[];
  perguntas: Pergunta[];
  fontes: Fonte[];
  /** Slugs de outros guias. */
  relacionados: string[];
};

export type Termo = {
  slug: string;
  nome: string;
  /** 40 a 60 palavras. */
  definicao: string;
  detalhe?: string;
  /** Ex.: "Lei 14.133/2021, art. 6º, XLI". */
  artigo?: string;
  /** Slugs de outros termos. */
  relacionados: string[];
  /** Slug do guia mais próximo. */
  guia?: string;
};
