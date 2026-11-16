import type { Periodo } from '../planos';

/**
 * Cupons do checkout próprio do Pro. Cada um tem de existir também na Cakto (produto Edital Map Pro → Cupons) com o mesmo
 * desconto: a Cakto ignora em silêncio cupom que não conhece e cobra o preço cheio, então o site só mostra desconto de
 * cupom desta lista e só manda à Cakto o que está aqui.
 * ALUNO50 (16/11/2026): alunos do curso, 50% só na 1ª cobrança do mensal (na Cakto: "Desconto só na 1ª cobrança").
 */
export type Cupom = { codigo: string; percentual: number; periodos: readonly Periodo[]; motivo: string };

export const CUPONS: readonly Cupom[] = [{ codigo: 'ALUNO50', percentual: 50, periodos: ['mensal'], motivo: 'desconto de aluno do curso' }];

export const normalizarCupom = (v: unknown): string => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, '').slice(0, 40) : '');

export type ResultadoCupom = { ok: true; cupom: Cupom } | { ok: false; erro: string };

/** Confere o código para o período escolhido; a mensagem de erro vai direto para a tela. */
export function conferirCupom(codigo: unknown, periodo: Periodo): ResultadoCupom {
  const c = normalizarCupom(codigo);
  if (!c) return { ok: false, erro: 'Digite o código do cupom.' };
  const cupom = CUPONS.find((x) => x.codigo === c);
  if (!cupom) return { ok: false, erro: 'Cupom não encontrado. Confira o código.' };
  if (!cupom.periodos.includes(periodo)) return { ok: false, erro: 'Este cupom vale só no plano mensal.' };
  return { ok: true, cupom };
}

/** Valor da 1ª cobrança com o cupom (arredonda para baixo o desconto em centavos, como a Cakto). */
export const centavosComCupom = (centavos: number, cupom: Cupom): number => centavos - Math.floor((centavos * cupom.percentual) / 100);
