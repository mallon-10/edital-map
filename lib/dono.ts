import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Dono confiável (spec do pagamento, §5). `em_interno=1` qualquer um liga em /sobre?interno=1 e serve só às métricas;
 * quem tira os limites é o cookie em_dono, com o HMAC de 'dono' feito com INTERNO_SEGREDO (só o servidor conhece).
 */
export function valorCookieDono(segredo: string): string {
  return createHmac('sha256', segredo).update('dono').digest('hex');
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function ehDono(cookie: string | undefined, segredo: string | undefined): boolean {
  if (!cookie || !segredo) return false;
  return iguais(cookie, valorCookieDono(segredo));
}

/** O `?interno=` de /sobre só vira dono quando é o próprio segredo. */
export function segredoDoEndereco(valor: string | undefined, segredo: string | undefined): boolean {
  if (!valor || !segredo) return false;
  return iguais(valor, segredo);
}
