import type { TomEtiqueta } from '@/lib/formato';

const BASE_CHIP = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold';

/** Chip de filtro; ativo em azul-marinho como no mockup. `grande`: 44 px de altura (toque na folha de Filtros do celular). */
export function chip(ativo: boolean, grande = false): string {
  return `${BASE_CHIP} ${grande ? 'h-11' : 'h-9'} ${ativo ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-raised text-ink hover:bg-sunken'}`;
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
