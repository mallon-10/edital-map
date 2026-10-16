import type { TomEtiqueta } from '@/lib/formato';

const BASE_CHIP = 'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold';

/** Chip de filtro; ativo em azul-marinho como no mockup. A variante `pro` (recurso em breve) é tracejada e sem fundo; `ativo` não se aplica a ela. */
export function chip(ativo: boolean, variante: 'padrao' | 'pro' = 'padrao'): string {
  if (variante === 'pro') return `${BASE_CHIP} border-dashed border-line-strong bg-transparent text-ink-muted hover:bg-sunken`;
  return `${BASE_CHIP} ${ativo ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-raised text-ink hover:bg-sunken'}`;
}

export const ESTILO_ETIQUETA: Record<TomEtiqueta, string> = {
  urgente: 'bg-pin-soft text-pin-strong',
  proximo: 'bg-ouro-soft text-ouro-strong',
  novo: 'bg-rio-soft text-rio',
  aberto: 'bg-mata-soft text-mata',
};

export const PONTO_ETIQUETA: Record<TomEtiqueta, string> = {
  urgente: 'bg-pin',
  proximo: 'bg-ouro',
  novo: 'bg-rio',
  aberto: 'bg-mata',
};
