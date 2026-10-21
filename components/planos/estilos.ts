import type { TomBeneficio } from '@/lib/paginaPlanos';

/** Botões e rótulos da página de planos, no visual da página inicial nova (pílulas de 54/60 px, linha mono). */
const PILULA =
  'inline-flex h-[54px] items-center justify-center gap-2 rounded-full px-7 text-[17px] font-semibold lg:h-[60px] lg:px-9 lg:text-[18px]';

export const PILULA_PIN = `${PILULA} bg-pin text-on-pin transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(255,90,31,.3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0`;
export const PILULA_LINHA = `${PILULA} border border-line-strong bg-raised text-ink hover:bg-sunken`;

export const MONO = 'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted lg:text-xs';
export const H2 = 'text-[24px] font-bold leading-tight tracking-[-0.015em] md:text-[30px]';

export const QUADRADO = 'flex size-12 shrink-0 items-center justify-center rounded-[15px]';
export const TOM: Record<TomBeneficio | 'creme', string> = {
  creme: 'bg-surface text-pin-strong',
  pin: 'bg-pin-soft text-pin-strong',
  mata: 'bg-mata-soft text-mata',
  rio: 'bg-rio-soft text-rio',
  ouro: 'bg-ouro-soft text-ouro-strong',
};
