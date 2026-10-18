/**
 * Logs do job dos alertas e do resumo: o repositório é público, então os logs do GitHub Actions também. Nada de e-mail,
 * token, uuid completo nem chave: só contagens e, no máximo, os 8 primeiros caracteres de um id.
 */

const UUID = /\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const EMAIL = /[^\s@<>()"'`,;:[\]]+@[^\s@<>()"'`,;:[\]]+\.[^\s@<>()"'`,;:[\]]+/g;
const CHAVE_RESEND = /\bre_[A-Za-z0-9_]{8,}/g;

export const curto = (id: string) => id.slice(0, 8);

/** Linha pronta para log público. `segredos`: valores exatos a esconder (a chave da API, por exemplo). */
export function limparLog(linha: string, segredos: ReadonlyArray<string | null | undefined> = []): string {
  let l = linha;
  for (const s of segredos) if (s) l = l.split(s).join('[chave]');
  return l.replace(CHAVE_RESEND, '[chave]').replace(EMAIL, '[e-mail]').replace(UUID, '$1…');
}
