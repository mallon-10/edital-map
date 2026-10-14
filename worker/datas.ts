import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const FUSO = 'America/Sao_Paulo';

/** Data do PNCP sem fuso ("2026-09-22T08:00:00"), lida como horário de Brasília, em ISO UTC. */
export function deBrasilia(valor: string | null | undefined): string | null {
  if (!valor || !valor.trim()) return null;
  const data = fromZonedTime(valor, FUSO);
  if (Number.isNaN(data.getTime())) throw new Error(`Data inválida do PNCP: ${valor}`);
  return data.toISOString();
}

export function hojeBrasilia(agora: Date): string {
  return formatInTimeZone(agora, FUSO, 'yyyy-MM-dd');
}

export function somarDias(dia: string, n: number): string {
  const data = new Date(`${dia}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + n);
  return data.toISOString().slice(0, 10);
}

export function paraPncp(dia: string): string {
  return dia.replaceAll('-', '');
}

export function inicioDoDia(dia: string): string {
  return deBrasilia(`${dia}T00:00:00`) as string;
}
