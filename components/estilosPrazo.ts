import type { Tom } from '@/lib/formato';

export const TAG_PRAZO: Record<Tom, string> = {
  urgente: 'bg-pin-soft text-pin-strong',
  proximo: 'bg-ouro-soft text-ouro-strong',
  longe: 'bg-mata-soft text-mata',
  encerrado: 'bg-sunken text-ink-muted',
};
export const PONTO_PRAZO: Record<Tom, string> = {
  urgente: 'bg-pin',
  proximo: 'bg-ouro',
  longe: 'bg-mata',
  encerrado: 'bg-ink-muted',
};
export const TEXTO_PRAZO: Record<Tom, string> = {
  urgente: 'font-semibold text-pin-strong',
  proximo: 'font-semibold text-ouro-strong',
  longe: 'text-ink-muted',
  encerrado: 'text-ink-muted',
};
