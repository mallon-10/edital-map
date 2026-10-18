/**
 * Logs do job dos alertas e do resumo: o repositório é público, então os logs do GitHub Actions também. Nada de e-mail,
 * token, uuid completo nem chave: só contagens e, no máximo, os 8 primeiros caracteres de um id.
 */

const UUID = /\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const EMAIL = /[^\s@<>()"'`,;:[\]]+@[^\s@<>()"'`,;:[\]]+\.[^\s@<>()"'`,;:[\]]+/g;
/** E-mail dentro de URL (o @ codificado como %40). */
const EMAIL_CODIFICADO = /[A-Za-z0-9._%+-]+%40[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi;
/** Token de descadastro em link (?t=…): `t` no começo de palavra, para não pegar limit=, total=. */
const TOKEN = /\bt=[^\s>&"]+/g;
const CHAVE_RESEND = /\bre_[A-Za-z0-9_]{8,}/g;

export const curto = (id: string) => id.slice(0, 8);

/** Linha pronta para log público. `segredos`: valores exatos a esconder (chave da API, segredo dos tokens, service role). */
export function limparLog(linha: string, segredos: ReadonlyArray<string | null | undefined> = []): string {
  let l = linha;
  for (const s of segredos) if (s) l = l.split(s).join('[chave]');
  return l
    .replace(TOKEN, 't=[token]')
    .replace(CHAVE_RESEND, '[chave]')
    .replace(EMAIL_CODIFICADO, '[e-mail]')
    .replace(EMAIL, '[e-mail]')
    .replace(UUID, '$1…');
}
