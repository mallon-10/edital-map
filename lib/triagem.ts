import { NOME_ASSESSORIA, type EditalAssessoria } from './assessoria';
import { dataHora } from './formato';
import { url } from './seo/site';

/**
 * Triagem antes do WhatsApp (components/assessoria/TriagemAssessoria.tsx): três perguntas de um toque, sem pedir dado
 * pessoal. A assessoria trabalha em cima de um edital; sem edital, o caminho é a busca. Quem quer terceirizar tudo fica
 * sabendo que o serviço é de orientação antes de falar com a gente.
 */
export type RespostasTriagem = {
  cnpj: 'sim' | 'nao' | 'incerto';
  licitacao: 'encontrei' | 'procurando' | 'comecar';
  ajuda: 'entender' | 'aprender' | 'terceirizar' | 'indefinido';
};
export type IdPergunta = keyof RespostasTriagem;
export type ResultadoTriagem = 'assessoria' | 'buscar' | 'terceirizacao';

type Pergunta = { id: IdPergunta; pergunta: string; opcoes: ReadonlyArray<{ valor: string; rotulo: string }> };

const PERGUNTAS: readonly Pergunta[] = [
  {
    id: 'cnpj',
    pergunta: 'Sua empresa já possui CNPJ ativo?',
    opcoes: [
      { valor: 'sim', rotulo: 'Sim' },
      { valor: 'nao', rotulo: 'Ainda não' },
      { valor: 'incerto', rotulo: 'Não tenho certeza do que preciso' },
    ],
  },
  {
    id: 'licitacao',
    pergunta: 'Você já encontrou uma licitação de interesse?',
    opcoes: [
      { valor: 'encontrei', rotulo: 'Sim, já encontrei' },
      { valor: 'procurando', rotulo: 'Ainda estou procurando' },
      { valor: 'comecar', rotulo: 'Quero entender como começar' },
    ],
  },
  {
    id: 'ajuda',
    pergunta: 'Qual ajuda você procura?',
    opcoes: [
      { valor: 'entender', rotulo: 'Entender um edital e preparar meus documentos' },
      { valor: 'aprender', rotulo: 'Aprender como participar de licitações' },
      { valor: 'terceirizar', rotulo: 'Contratar alguém para executar todo o processo' },
      { valor: 'indefinido', rotulo: 'Ainda não sei exatamente' },
    ],
  },
];

/** Vindo de um edital, a resposta da segunda pergunta já é conhecida. */
export const perguntasDaTriagem = (comEdital: boolean): readonly Pergunta[] => (comEdital ? PERGUNTAS.filter((p) => p.id !== 'licitacao') : PERGUNTAS);

export function resultadoDaTriagem(r: RespostasTriagem): ResultadoTriagem {
  if (r.ajuda === 'terceirizar') return 'terceirizacao';
  return r.licitacao === 'encontrei' ? 'assessoria' : 'buscar';
}

export function avisoDaTriagem(r: RespostasTriagem): string | null {
  return r.cnpj === 'nao' ? 'As licitações costumam exigir CNPJ ativo. Conte isso na conversa para confirmarmos, antes de contratar, se o serviço faz sentido para você.' : null;
}

const rotulo = (id: IdPergunta, valor: string) => PERGUNTAS.find((p) => p.id === id)?.opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;

const MAX_TITULO = 120;

function blocoDoEdital(e: EditalAssessoria): string[] {
  const titulo = e.titulo.length > MAX_TITULO ? `${e.titulo.slice(0, MAX_TITULO - 1)}…` : e.titulo;
  return [
    '',
    titulo,
    `${e.orgao} · ${e.local}`,
    ...(e.encerramento_em ? [`Propostas até ${dataHora(e.encerramento_em)}`] : []),
    url(`/edital/${e.slug}`),
  ];
}

/** Texto pronto do WhatsApp: serviço, respostas e, quando houver, o edital. Nada de CPF, CNPJ ou nome. */
export function mensagemTriagem(r: RespostasTriagem, edital: EditalAssessoria | null): string {
  const abertura =
    resultadoDaTriagem(r) === 'terceirizacao'
      ? 'Olá! Vim pelo Edital Map e quero esclarecer se vocês atendem a execução completa de uma licitação.'
      : `Olá! Vim pelo Edital Map e quero saber sobre a ${NOME_ASSESSORIA}.`;
  return [
    abertura,
    '',
    `Empresa com CNPJ ativo: ${rotulo('cnpj', r.cnpj)}`,
    `Licitação: ${rotulo('licitacao', r.licitacao)}`,
    `Ajuda: ${rotulo('ajuda', r.ajuda)}`,
    ...(edital ? blocoDoEdital(edital) : []),
  ].join('\n');
}

export function linkTriagem(numero: string, r: RespostasTriagem, edital: EditalAssessoria | null): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemTriagem(r, edital))}`;
}
