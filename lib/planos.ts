import type { PlanoPago } from './eventos';
import { LIMITE_GRATIS } from './limites';

/** Planos da spec de Planos (docs/superpowers/specs/2026-10-16-fase-3-planos-design.md §2). Mensal e anual (anual = 10 mensalidades, 2 meses grátis). */
export type IdPlano = 'gratis' | PlanoPago;
export type Periodo = 'mensal' | 'anual';
export const PERIODOS: readonly Periodo[] = ['mensal', 'anual'];
export const PLANOS: ReadonlyArray<{ id: IdPlano; nome: string; centavosMes: number }> = [
  { id: 'gratis', nome: 'Grátis', centavosMes: 0 },
  { id: 'basic', nome: 'Basic', centavosMes: 4990 },
  { id: 'pro', nome: 'Pro', centavosMes: 8990 },
];

/** Meses cobrados no plano anual (12 meses pagando 10). */
export const MESES_COBRADOS_ANUAL = 10;

/** Centavos -> "R$ 1.499,00" (pt-BR, sem depender do Intl). */
export function formatarReais(centavos: number): string {
  const reais = Math.floor(centavos / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${reais},${String(centavos % 100).padStart(2, '0')}`;
}

export type PrecoPlano = { principal: string; equivalente: string | null };

/** Preço de um plano no período: principal ("R$ 499,00/ano") e, no anual, o equivalente por mês. */
export function precoDoPlano(centavosMes: number, periodo: Periodo): PrecoPlano {
  if (centavosMes === 0) return { principal: 'R$ 0', equivalente: null };
  if (periodo === 'mensal') return { principal: `${formatarReais(centavosMes)}/mês`, equivalente: null };
  const anual = centavosMes * MESES_COBRADOS_ANUAL;
  return { principal: `${formatarReais(anual)}/ano`, equivalente: `${formatarReais(Math.round(anual / 12))}/mês · 2 meses grátis` };
}

/** Célula da tabela: texto, ✓ (true) ou — (false); `emBreve` marca o que ainda não existe. */
export type Celula = { valor: string | boolean; emBreve?: boolean };
export type LinhaPlanos = { recurso: string; gratis: Celula; basic: Celula; pro: Celula };

export const LINHAS_PLANOS: readonly LinhaPlanos[] = [
  { recurso: 'Buscas por dia', gratis: { valor: String(LIMITE_GRATIS.busca) }, basic: { valor: '15' }, pro: { valor: 'Ilimitadas' } },
  { recurso: 'Editais abertos por dia', gratis: { valor: String(LIMITE_GRATIS.edital) }, basic: { valor: '15' }, pro: { valor: 'Ilimitados' } },
  { recurso: 'Botão "Abrir edital oficial"', gratis: { valor: false }, basic: { valor: true }, pro: { valor: true } },
  { recurso: 'Filtros (UF, município, valor, modalidade, prazo)', gratis: { valor: true }, basic: { valor: true }, pro: { valor: true } },
  { recurso: 'Editais salvos', gratis: { valor: false }, basic: { valor: 'Até 10', emBreve: true }, pro: { valor: 'Ilimitados', emBreve: true } },
  {
    recurso: 'Alertas por e-mail às 7h (busca salva)',
    gratis: { valor: false },
    basic: { valor: '1 busca', emBreve: true },
    pro: { valor: 'Ilimitados', emBreve: true },
  },
  {
    recurso: 'Vencimentos por e-mail (3 dias e 1 dia antes do prazo de um salvo)',
    gratis: { valor: false },
    basic: { valor: true, emBreve: true },
    pro: { valor: true, emBreve: true },
  },
  { recurso: 'Editais parecidos abertos', gratis: { valor: '3 primeiros' }, basic: { valor: true }, pro: { valor: true } },
  { recurso: 'Filtros Pro (raio em km e órgão comprador)', gratis: { valor: false }, basic: { valor: false }, pro: { valor: true } },
  { recurso: 'Exportar a lista para planilha', gratis: { valor: false }, basic: { valor: false }, pro: { valor: true } },
  {
    recurso: 'Preço de referência, quem venceu e resumo com IA',
    gratis: { valor: false },
    basic: { valor: false },
    pro: { valor: true, emBreve: true },
  },
];

/** A tabela descreve os planos de quando o pagamento abrir; até lá, o que já existe está aberto a todos. */
export const AVISO_PLANOS =
  'Enquanto o pagamento não abre, o botão "Abrir edital oficial", os editais parecidos, os filtros Pro e a exportação ficam liberados para todos, dentro dos limites do Grátis.';
