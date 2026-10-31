import { LIMITES_CONTA } from './limitesConta';
import { formatarReais, PLANOS, ROTINA_ENVIO, type Periodo, type Plano, type PlanoVendido } from './planos';

/**
 * Textos e preços da página /planos (spec 2026-10-21-planos-conversao-design.md). Só o que já funciona é vendido; o que
 * ainda não existe fica em EM_PREPARACAO. Cada fato das perguntas vem do código (alertas às 7h07, até 20 por alerta,
 * cancelamento mantém a validade, login por código). Os preços vêm de PLANOS (lib/planos.ts).
 */

const ALERTAS = LIMITES_CONTA.pro.alertas;
const PRO = PLANOS.find((p) => p.id === 'pro')!;

export type PrecoNaPagina = { valor: string; sufixo: string; equivale: string | null; nota: string };

/** Economia do anual contra 12 mensalidades, em % inteiro (R$ 349,90 contra 12 × R$ 37,90: 23). */
export function economiaAnual(p: Pick<PlanoVendido, 'centavosMes' | 'centavosAno'>): number {
  return Math.round((1 - p.centavosAno / (p.centavosMes * 12)) * 100);
}

/** Preço do cartão: no anual, o valor cobrado por ano em destaque, o equivalente por mês e a conta da economia. */
export function precoNaPagina(p: Pick<PlanoVendido, 'centavosMes' | 'centavosAno'>, periodo: Periodo): PrecoNaPagina {
  if (p.centavosMes === 0) return { valor: 'R$ 0', sufixo: 'para sempre', equivale: null, nota: 'Sem cartão e sem conta.' };
  if (periodo === 'mensal') {
    return { valor: formatarReais(p.centavosMes), sufixo: '/mês', equivale: null, nota: 'Cobrado todo mês. Cancele quando quiser.' };
  }
  return {
    valor: formatarReais(p.centavosAno),
    sufixo: '/ano',
    equivale: `Equivale a ${formatarReais(Math.round(p.centavosAno / 12))}/mês`,
    nota: `Cobrado uma vez por ano: cerca de ${economiaAnual(p)}% a menos que 12 mensalidades (${formatarReais(p.centavosMes * 12)}).`,
  };
}

/** O que a página precisa saber do visitante: se o pagamento está ligado e o plano de hoje. */
export type EstadoPlanos = { pagamento: boolean; atual: Plano };

/** Pro (ou o Basic antigo): a página mostra "Seu plano hoje" e leva aos alertas. Fora do 'use client' (o topo e a
 * chamada final rodam no servidor). */
export const jaEPro = (atual: Plano) => atual !== 'gratis';

/** Checkout próprio (spec do pagamento): o período vai no endereço e /assinar abre nele. */
export const hrefAssinar = (periodo: Periodo) => `/assinar?periodo=${periodo}`;

export const TOPO = {
  sobretitulo: 'Monitoramento automático de licitações',
  titulo: 'Sua próxima oportunidade',
  destaque: 'pode aparecer amanhã.',
  subtitulo:
    'O Edital Map encontra as licitações do seu segmento. Com o Pro, você recebe automaticamente as novas oportunidades e acompanha tudo em um só lugar.',
  cta: 'Começar a receber oportunidades',
  beneficios: ['Alertas diários às 7h', 'Meu Radar', 'Resumo semanal às segundas'],
} as const;

export const PUBLICO_PLANOS = {
  gratis: 'Para quem deseja pesquisar oportunidades quando precisar.',
  pro: 'Para quem deseja acompanhar oportunidades continuamente e economizar tempo.',
} as const;

export type IconePlanos = 'filtro' | 'sino' | 'email' | 'calendario' | 'radar' | 'salvar';

export const PASSOS: ReadonlyArray<{ icone: IconePlanos; titulo: string; texto: string }> = [
  { icone: 'filtro', titulo: 'Configure seus filtros', texto: 'O que você vende, estados ou municípios, faixa de valor e modalidade.' },
  { icone: 'sino', titulo: 'Salve como alerta', texto: `Até ${ALERTAS} alertas, um para cada linha de produto ou região.` },
  { icone: 'email', titulo: 'Receba às 7h', texto: 'Os editais novos do seu filtro chegam no seu e-mail, todo dia de manhã.' },
];

export const ITENS_GRATIS = [
  'Buscas à vontade, com 5 editais por pesquisa',
  'Mapa, filtros, raio em km e órgão',
  'Exportar para planilha (CSV)',
  'Link do edital oficial',
] as const;

export const ITENS_PRO = [
  'Todos os editais de cada pesquisa',
  `Até ${ALERTAS} alertas por e-mail às 7h`,
  'Resumo semanal na segunda',
  'Meu Radar com o perfil da sua empresa',
  'Editais salvos com status e anotação',
] as const;

export type TomBeneficio = 'pin' | 'mata' | 'rio' | 'ouro';

export const BENEFICIOS_PRO: ReadonlyArray<{ icone: IconePlanos; tom: TomBeneficio; titulo: string; texto: string }> = [
  {
    icone: 'sino',
    tom: 'pin',
    titulo: 'Monitoramento automático',
    texto:
      'Receba diariamente novas licitações relacionadas ao seu negócio. Por volta das 7h chegam só os editais novos, sem repetir o que você já recebeu.',
  },
  {
    icone: 'calendario',
    tom: 'mata',
    titulo: 'Economia de tempo',
    texto: 'Em vez de pesquisar todo dia, você abre o e-mail. Toda segunda, um resumo com o que entrou no seu Meu Radar na semana.',
  },
  {
    icone: 'salvar',
    tom: 'ouro',
    titulo: 'Organização',
    texto:
      'Marque cada edital como Salvo, Em análise, Vou participar ou Descartado e anote o que importa. Os descartados saem do Meu Radar.',
  },
  {
    icone: 'radar',
    tom: 'rio',
    titulo: 'Personalização por segmento e região',
    texto: `Monitore até ${ALERTAS} segmentos ou regiões diferentes, com termos, estados ou municípios, valor e modalidade. No Meu Radar, tudo em uma página, sem refazer a busca.`,
  },
];

export const EM_PREPARACAO = {
  itens: ['Preço de referência', 'quem venceu', 'resumo com IA'],
  texto: 'Preço de referência, quem venceu e resumo com IA ainda não fazem parte do Pro. Quem assina hoje paga pelos quatro recursos acima.',
} as const;

/** Célula da comparação: texto, incluído (true) ou não (false). */
export type LinhaDiferenca = { recurso: string; gratis: string | boolean; pro: string | boolean };

export const DIFERENCAS: readonly LinhaDiferenca[] = [
  { recurso: 'Descobrir editais novos', gratis: 'Você pesquisa', pro: 'Chegam por e-mail às 7h' },
  { recurso: 'Segmentos e regiões acompanhados', gratis: false, pro: `Até ${ALERTAS}` },
  { recurso: 'Resumo semanal às segundas', gratis: false, pro: true },
  { recurso: 'Meu Radar', gratis: false, pro: true },
  { recurso: 'Organizar editais', gratis: false, pro: 'Status e anotações' },
  { recurso: 'Editais por pesquisa', gratis: '5', pro: 'Todos' },
];

/** Só fatos do produto: nada de depoimento, contador ou número de assinantes. */
export const CONFIANCA: ReadonlyArray<{ titulo: string; texto: string }> = [
  { titulo: 'Fonte oficial: PNCP', texto: 'Os editais vêm do Portal Nacional de Contratações Públicas, sempre com o link do edital oficial.' },
  { titulo: 'Atualizado a cada 3 horas', texto: 'Lemos as licitações abertas dos 27 estados a cada 3 horas.' },
  { titulo: 'Como os alertas funcionam', texto: `${ROTINA_ENVIO} Sem novidade, não mandamos e-mail.` },
  { titulo: 'Pix Automático ou cartão', texto: 'Pagamento processado pela Cakto, mensal ou anual.' },
  { titulo: 'Cancele quando quiser', texto: 'O Pro continua até o fim do período que você já pagou.' },
];

export const INCLUIDO_NOS_DOIS = [
  'Botão "Abrir edital oficial"',
  'Filtros por UF, município, valor, modalidade e prazo',
  'Raio em km e órgão comprador',
  'Exportar a lista para planilha (CSV); numa pesquisa no grátis, os 5 liberados',
  'Editais parecidos abertos',
] as const;

export const PERGUNTAS: ReadonlyArray<{ pergunta: string; resposta: string }> = [
  {
    pergunta: 'De onde vêm os dados?',
    resposta:
      'Do PNCP, o Portal Nacional de Contratações Públicas. O Edital Map lê as licitações abertas dos 27 estados a cada 3 horas. Antes de participar, confira sempre o edital oficial.',
  },
  {
    pergunta: 'A que horas chegam os alertas?',
    resposta:
      'Todo dia, por volta das 7h (horário de Brasília), com os editais que entraram ou mudaram desde o último envio. Se não houver nada novo, não mandamos e-mail. O resumo semanal sai na segunda de manhã.',
  },
  {
    pergunta: 'Posso escolher o que recebo?',
    resposta:
      'Sim. Cada alerta tem os próprios filtros: termos, palavras para excluir, todo o Brasil, estados ou municípios, faixa de valor, modalidade e só exclusivas para ME/EPP. Cada e-mail traz até 20 editais por alerta.',
  },
  {
    pergunta: 'Dá para mudar ou pausar um alerta?',
    resposta: 'Sim. Em Alertas você edita, pausa, retoma ou exclui cada um. Todo e-mail tem um link para parar de receber aquele alerta.',
  },
  {
    pergunta: 'Como funciona a cobrança?',
    resposta:
      `Por Pix Automático ou cartão, processados pela Cakto. O mensal custa ${formatarReais(PRO.centavosMes)} e renova todo mês. O anual custa ${formatarReais(PRO.centavosAno)}, cobrados uma vez por ano, e renova a cada ano.`,
  },
  {
    pergunta: 'Como eu cancelo?',
    resposta:
      'Pelo link do e-mail da Cakto ou escrevendo para mallon@escalav.com.br. Depois de cancelar, o Pro continua até o fim do período que você já pagou.',
  },
  {
    pergunta: 'Funciona no celular e no computador?',
    resposta: 'Sim. Entre com o e-mail da compra (mandamos um código de 6 dígitos) e o Pro vale em qualquer aparelho.',
  },
  {
    pergunta: 'Preciso pagar para pesquisar?',
    resposta: 'Não. Pesquisar é grátis e não pede conta: cada pesquisa mostra 5 editais, e o Pro libera todos. Navegar pelo mapa e pelas páginas de licitações e abrir qualquer edital continuam livres.',
  },
];

export const CHAMADA_FINAL = {
  titulo: 'Pare de perder oportunidades',
  destaque: 'de vender para o governo.',
} as const;
