/** Áreas só do Pro: o grátis vê um exemplo apagado com o cadeado e o botão para liberar (components/conta/PaginaBloqueada.tsx). */
export type RecursoPro = 'radar' | 'oportunidades' | 'alertas';

export const BOTAO_LIBERAR_PRO = 'Liberar o Pro';

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
