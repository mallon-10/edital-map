import { randomBytes } from 'node:crypto';

/** Chave de acesso da assinatura: EM-XXXX-XXXX-XXXX (12 caracteres, ~59 bits), sem 0/O/1/I/L para ditar sem erro. */
export const ALFABETO_CHAVE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAMANHO = 12;
/** Maior múltiplo de 31 que cabe num byte: acima disso o byte é descartado (sem viés no módulo). */
const TETO = Math.floor(256 / ALFABETO_CHAVE.length) * ALFABETO_CHAVE.length;

const comHifens = (s: string) => `EM-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;

export function gerarChave(aleatorio: (n: number) => Buffer = randomBytes): string {
  let s = '';
  while (s.length < TAMANHO) {
    for (const b of aleatorio(TAMANHO * 2)) {
      if (b >= TETO) continue;
      s += ALFABETO_CHAVE[b % ALFABETO_CHAVE.length];
      if (s.length === TAMANHO) break;
    }
  }
  return comHifens(s);
}

/** Como a pessoa digitou → formato gravado; null se não for uma chave possível. */
export function normalizarChave(t: string): string | null {
  const limpo = t.toUpperCase().replace(/[\s-]/g, '');
  // O prefixo "EM" só sai quando veio junto (14 caracteres): uma chave sorteada pode começar com "EM".
  const s = limpo.length === TAMANHO + 2 && limpo.startsWith('EM') ? limpo.slice(2) : limpo;
  if (s.length !== TAMANHO) return null;
  for (const ch of s) if (!ALFABETO_CHAVE.includes(ch)) return null;
  return comHifens(s);
}
