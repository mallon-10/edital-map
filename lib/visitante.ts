/** Cookie do navegador anônimo (conta o uso do dia e agrupa os eventos) e marca do navegador interno (o dono). */
export const COOKIE_VISITANTE = 'em_visitante';
export const COOKIE_INTERNO = 'em_interno';
/** Dono confiável (lib/dono.ts): libera tudo; o em_interno sozinho só tira as visitas das métricas. */
export const COOKIE_DONO = 'em_dono';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const OPCOES_COOKIE = {
  maxAge: 60 * 60 * 24 * 365,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function visitanteValido(v: string | null | undefined): v is string {
  return typeof v === 'string' && UUID.test(v);
}

/** Visitante do cookie, ou um novo (`gerar`) quando falta ou é inválido. */
export function visitanteDoCookie(valor: string | undefined, gerar: () => string): { visitante: string; novo: boolean } {
  return visitanteValido(valor) ? { visitante: valor, novo: false } : { visitante: gerar(), novo: true };
}
