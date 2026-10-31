import type { PlanoPago } from './eventos';

/**
 * Planos (spec do pagamento, revisão 2, §2): só Grátis e Pro. O Basic saiu de linha; `'basic'` continua no tipo só como
 * valor antigo aceito pelo banco (perfis.plano, assinaturas), nada novo o cria.
 */
export type IdPlano = 'gratis' | PlanoPago;
/** Plano de quem está na página (lib/servidor/plano.ts, planoAtual). */
export type Plano = IdPlano;

/** O que o cabeçalho precisa saber do visitante: o plano e se é o dono confiável (cookie em_dono). */
export type PlanoDaPagina = { plano: Plano; dono: boolean };

/** A rotina de envio do Pro, com a mesma frase em todo o site. */
export const ROTINA_ENVIO = 'Alertas de novas oportunidades todos os dias às 7h e resumo semanal às segundas-feiras.';

/**
 * Oferta do Pro (decisão de 19/10/2026): buscar, abrir editais, link oficial, raio, órgão, parecidos e exportar são
 * grátis e sem limite; o que se vende é receber as licitações certas por e-mail (alertas, resumo semanal, Meu Radar).
 * A faixa abaixo do cabeçalho mostra a quem não é Pro que o e-mail é do Pro e leva aos planos (components/FaixaOferta.tsx).
 */
export const OFERTA = {
  texto: 'Pare de perder oportunidades de vender para o governo',
  apoio: ROTINA_ENVIO,
  cta: 'Conhecer o Pro',
  href: '/planos',
} as const;

/** Páginas em que a faixa da oferta não aparece: o radar, a conta, o checkout e os planos (destino do botão). */
const SEM_FAIXA = ['/radar', '/entrar', '/assinar', '/assinatura', '/obrigado', '/alertas', '/oportunidades', '/planos'];

/** Faixa da oferta: para quem não é Pro nem o dono, fora das páginas da conta e do checkout. Plano desconhecido: sem faixa. */
export function mostrarOferta(p: PlanoDaPagina | null | undefined, caminho: string): boolean {
  if (!p || p.dono || p.plano !== 'gratis') return false;
  return !SEM_FAIXA.some((c) => caminho === c || caminho.startsWith(c + '/'));
}
export type Periodo = 'mensal' | 'anual';
export const PERIODOS: readonly Periodo[] = ['mensal', 'anual'];

export type PlanoVendido = { id: 'gratis' | 'pro'; nome: string; centavosMes: number; centavosAno: number };
export const PLANOS: readonly PlanoVendido[] = [
  { id: 'gratis', nome: 'Grátis', centavosMes: 0, centavosAno: 0 },
  { id: 'pro', nome: 'Pro', centavosMes: 3790, centavosAno: 34990 },
];

/** Centavos -> "R$ 1.499,00" (pt-BR, sem depender do Intl). */
export function formatarReais(centavos: number): string {
  const reais = Math.floor(centavos / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${reais},${String(centavos % 100).padStart(2, '0')}`;
}

export type PrecoPlano = { principal: string; equivalente: string | null };

/** Preço do plano no período: principal ("R$ 349,90/ano") e, no anual, o equivalente por mês e a economia. */
export function precoDoPlano(p: Pick<PlanoVendido, 'centavosMes' | 'centavosAno'>, periodo: Periodo): PrecoPlano {
  if (p.centavosMes === 0) return { principal: 'R$ 0', equivalente: null };
  if (periodo === 'mensal') return { principal: `${formatarReais(p.centavosMes)}/mês`, equivalente: null };
  const economia = Math.round((1 - p.centavosAno / (p.centavosMes * 12)) * 100);
  return {
    principal: `${formatarReais(p.centavosAno)}/ano`,
    equivalente: `${formatarReais(Math.round(p.centavosAno / 12))}/mês · economize ${economia}%`,
  };
}

/** "R$ 37,90/mês", nas ofertas fora da página de planos. */
export const PRECO_PRO_MENSAL = precoDoPlano(PLANOS.find((p) => p.id === 'pro')!, 'mensal').principal;

/** Com o pagamento desligado (lista de espera no lugar do "Assinar o Pro"). */
export const AVISO_PLANOS =
  'Buscar, abrir editais, filtrar e exportar são grátis e sem limite. O pagamento do Pro ainda não abriu: entre na lista de espera e avisamos quando der para assinar os alertas e o resumo semanal.';
