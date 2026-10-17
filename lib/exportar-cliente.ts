import { nomeArquivo } from '@/lib/csv';

export const ERRO_EXPORTAR = 'Não foi possível exportar agora. Tente de novo.';

/** Mensagem vinda do corpo `{ erro }` da API; qualquer outra coisa vira a mensagem genérica em português. */
export function mensagemDaApi(corpo: unknown): string {
  const erro = (corpo as { erro?: unknown } | null)?.erro;
  return typeof erro === 'string' && erro ? erro : ERRO_EXPORTAR;
}

/** Nome do arquivo no Content-Disposition; sem ele, "editais-AAAA-MM-DD.csv". */
export function nomeDoArquivo(contentDisposition: string | null, agora: Date): string {
  return /filename="([^"]+)"/.exec(contentDisposition ?? '')?.[1] ?? nomeArquivo(agora);
}

/** Erro cuja mensagem veio da API (única que pode ser mostrada como está). */
export class ErroDaApi extends Error {}
