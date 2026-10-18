import { normalizar } from './termos';

export type Trecho = { texto: string; marcado: boolean };

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Raiz de cada palavra dos termos (sem acento, minúscula, sem o "s" final), 3+ letras; as mais longas primeiro. */
function raizes(termos: readonly string[]): string[] {
  const r = new Set<string>();
  for (const t of termos) {
    for (const p of normalizar(t).split(' ')) {
      const raiz = p.length >= 4 && p.endsWith('s') ? p.slice(0, -1) : p;
      if (raiz.length >= 3) r.add(raiz);
    }
  }
  return [...r].sort((a, b) => b.length - a.length);
}

/** Trechos do texto com as palavras que começam por algum termo marcadas (o texto original não muda). */
export function destacar(texto: string, termos: readonly string[]): Trecho[] {
  if (!texto) return [];
  const rs = raizes(termos);
  if (rs.length === 0) return [{ texto, marcado: false }];
  const saida: Trecho[] = [];
  let fim = 0;
  for (const m of texto.matchAll(/[\p{L}\p{N}\p{M}]+/gu)) {
    const base = semAcento(m[0]);
    // Raiz curta (até 3 letras, ex.: EPI) exige a palavra inteira, com "s" final opcional.
    if (!rs.some((r) => (r.length <= 3 ? base === r || base === `${r}s` : base.startsWith(r)))) continue;
    const inicio = m.index ?? 0;
    if (inicio > fim) saida.push({ texto: texto.slice(fim, inicio), marcado: false });
    saida.push({ texto: m[0], marcado: true });
    fim = inicio + m[0].length;
  }
  if (fim < texto.length) saida.push({ texto: texto.slice(fim), marcado: false });
  return saida;
}
