import type { PlanoPago } from './eventos';
import { LIMITE_GRATIS } from './limites';

/** Planos da spec de Planos (docs/superpowers/specs/2026-10-16-fase-3-planos-design.md §2). Só mensal por enquanto. */
export type IdPlano = 'gratis' | PlanoPago;
export const PLANOS: ReadonlyArray<{ id: IdPlano; nome: string; preco: string }> = [
  { id: 'gratis', nome: 'Grátis', preco: 'R$ 0' },
  { id: 'basic', nome: 'Basic', preco: 'R$ 49,90/mês' },
  { id: 'pro', nome: 'Pro', preco: 'R$ 89,90/mês' },
];

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
    pro: { valor: 'Até 10 buscas', emBreve: true },
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
