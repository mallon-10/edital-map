import type { PlanoPago } from './eventos';
import { LIMITE_GRATIS } from './limites';

/**
 * Planos (spec do pagamento, revisão 2, §2): só Grátis e Pro. O Basic saiu de linha; `'basic'` continua no tipo só como
 * valor antigo aceito pelo banco (perfis.plano, assinaturas), nada novo o cria.
 */
export type IdPlano = 'gratis' | PlanoPago;
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

/** Célula da tabela: texto, ✓ (true) ou — (false); `emBreve` marca o que ainda não existe. */
export type Celula = { valor: string | boolean; emBreve?: boolean };
export type LinhaPlanos = { recurso: string; gratis: Celula; pro: Celula };

export const LINHAS_PLANOS: readonly LinhaPlanos[] = [
  { recurso: 'Buscas por dia', gratis: { valor: String(LIMITE_GRATIS.busca) }, pro: { valor: 'Ilimitadas' } },
  { recurso: 'Editais abertos por dia', gratis: { valor: String(LIMITE_GRATIS.edital) }, pro: { valor: 'Ilimitados' } },
  { recurso: 'Botão "Abrir edital oficial"', gratis: { valor: false }, pro: { valor: true } },
  { recurso: 'Filtros (UF, município, valor, modalidade, prazo)', gratis: { valor: true }, pro: { valor: true } },
  { recurso: 'Filtros Pro (raio em km e órgão comprador)', gratis: { valor: false }, pro: { valor: true } },
  { recurso: 'Exportar a lista para planilha', gratis: { valor: false }, pro: { valor: true } },
  { recurso: 'Editais parecidos abertos', gratis: { valor: '3 primeiros' }, pro: { valor: true } },
  { recurso: 'Resumo semanal por e-mail (segunda, 7h)', gratis: { valor: false }, pro: { valor: true, emBreve: true } },
  { recurso: 'Alertas por e-mail às 7h (busca salva)', gratis: { valor: false }, pro: { valor: true, emBreve: true } },
  { recurso: 'Editais salvos', gratis: { valor: false }, pro: { valor: 'Ilimitados', emBreve: true } },
  { recurso: 'Preço de referência, quem venceu e resumo com IA', gratis: { valor: false }, pro: { valor: true, emBreve: true } },
];

/** A tabela descreve os planos de quando o pagamento abrir; até lá, o que já existe está aberto a todos. */
export const AVISO_PLANOS =
  'Enquanto o pagamento não abre, o botão "Abrir edital oficial", os editais parecidos, os filtros Pro e a exportação ficam liberados para todos, dentro dos limites do Grátis.';
