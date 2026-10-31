import { PRECO_PRO_MENSAL, ROTINA_ENVIO } from './planos';

/**
 * Áreas só do Pro vistas pelo grátis (components/conta/PaginaBloqueada.tsx): Meu Radar e Alertas mostram o que o recurso
 * faz, com demonstração identificada; Minhas Oportunidades, o exemplo apagado com o cadeado.
 */
export type RecursoPro = 'radar' | 'oportunidades' | 'alertas';

export const BOTAO_LIBERAR_PRO = 'Liberar o Pro';

export const VITRINE_RADAR = {
  titulo: 'Seu radar de oportunidades, sempre atualizado.',
  texto: 'Imagine entrar no Edital Map e encontrar apenas as licitações relacionadas ao que sua empresa vende.',
  cta: `Ativar meu Radar — ${PRECO_PRO_MENSAL}`,
} as const;

/** Dados inventados e sem órgão de verdade: a tela diz que é demonstração (components/conta/PreviaRadar.tsx). */
export const EXEMPLOS_RADAR = [
  { id: '1', titulo: 'Aquisição de uniformes escolares', local: 'Interior de SP', prazo: 'Encerra em 3 dias', valor: 'R$ 412.380,00' },
  { id: '2', titulo: 'Registro de preços de camisetas e agasalhos', local: 'Região metropolitana de SP', prazo: 'Encerra em 9 dias', valor: 'R$ 96.500,00' },
  { id: '3', titulo: 'Fardamento para a guarda municipal', local: 'Interior de MG', prazo: 'Encerra em 12 dias', valor: 'R$ 58.200,00' },
] as const;

/** Status de exemplo na demonstração: os mesmos de Minhas Oportunidades, mais o "Novo" do Meu Radar. */
export const STATUS_RADAR = ['Novo', 'Em análise', 'Vou participar'] as const;

export const VITRINE_ALERTAS = {
  titulo: 'Novos editais no seu e-mail, sem pesquisar todo dia.',
  texto: ROTINA_ENVIO,
  cta: 'Quero receber alertas diários',
  passos: ['Escolha o que sua empresa vende', 'Defina as regiões de interesse', 'Receba novos editais automaticamente'],
} as const;

export const PREVIA_ALERTA = {
  titulo: 'Prévia do seu alerta',
  aviso: 'Este alerta ainda não foi criado. A ativação depende da assinatura do Pro: depois de assinar, você confirma os filtros e ele começa a valer.',
  semProdutos: 'Você escolhe os produtos ao ativar',
  quando: 'Todos os dias às 7h, quando houver novidade',
  cta: `Ativar este alerta — ${PRECO_PRO_MENSAL}`,
  voltar: 'Continuar pesquisando grátis',
} as const;

export const BLOQUEIO_PRO: Record<RecursoPro, { nome: string; titulo: string; texto: string; caminho: string }> = {
  radar: {
    nome: 'Meu Radar',
    titulo: 'Meu Radar é do plano Pro',
    texto: 'Todos os editais abertos para o que sua empresa vende, num lugar só, com as novidades desde a sua última visita.',
    caminho: '/radar',
  },
  oportunidades: {
    nome: 'Minhas Oportunidades',
    titulo: 'Minhas Oportunidades é do plano Pro',
    texto: 'Salve os editais que interessam, marque o status de cada um e anote observações para não perder nenhum prazo.',
    caminho: '/oportunidades',
  },
  alertas: {
    nome: 'Alertas por e-mail',
    titulo: 'Alertas por e-mail são do plano Pro',
    texto: 'Todo dia às 7h, os editais novos do que sua empresa vende, na sua região, direto no seu e-mail e sem repetir.',
    caminho: '/alertas',
  },
};
