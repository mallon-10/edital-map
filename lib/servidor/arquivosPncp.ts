import 'server-only';
import { BASE_PNCP } from '@/worker/config';
import type { ChaveCompra } from '@/worker/mapear';
import type { ArquivoEdital } from '../tipos';

/** Tempo máximo da chamada antes de desistir (a página mostra "Documentos indisponíveis agora"). */
const TIMEOUT_MS = 8_000;
/** Só links de download do próprio PNCP vão para a página. */
const LINK_PNCP = /^https:\/\/pncp\.gov\.br\//;
/** Edital e Termo de Referência primeiro: são onde ficam as exigências de habilitação. */
const ORDEM_TIPO: Record<number, number> = { 2: 0, 4: 1 };

function objeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Arquivos publicados da compra (edital, termo de referência, anexos), direto do PNCP, com o link de download.
 * Rede fora, timeout, HTTP de erro ou resposta fora do formato lançam exceção.
 * `base` existe para simular falha (PNCP_ITENS_BASE apontando para um endereço que não responde).
 */
export async function arquivosDoPncp(
  compra: ChaveCompra,
  buscar: typeof fetch = fetch,
  base: string = process.env.PNCP_ITENS_BASE || BASE_PNCP,
): Promise<ArquivoEdital[]> {
  const resp = await buscar(`${base}/v1/orgaos/${compra.cnpj}/compras/${compra.ano}/${compra.sequencial}/arquivos`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (resp.status === 204) return [];
  if (!resp.ok) throw new Error(`arquivos do PNCP: HTTP ${resp.status}`);
  const corpo = await resp.text();
  const lista: unknown = corpo ? JSON.parse(corpo) : [];
  if (!Array.isArray(lista)) throw new Error('arquivos do PNCP: resposta fora do formato');

  const validos: Array<ArquivoEdital & { ordem: number; seq: number }> = [];
  for (const a of lista) {
    if (!objeto(a) || a.statusAtivo === false) continue;
    const url = typeof a.url === 'string' ? a.url.trim() : '';
    if (!LINK_PNCP.test(url)) continue;
    const tipo = typeof a.tipoDocumentoNome === 'string' && a.tipoDocumentoNome.trim() ? a.tipoDocumentoNome.trim() : 'Documento';
    const titulo = typeof a.titulo === 'string' && a.titulo.trim() ? a.titulo.trim() : tipo;
    const tipoId = typeof a.tipoDocumentoId === 'number' ? a.tipoDocumentoId : -1;
    const seq = typeof a.sequencialDocumento === 'number' ? a.sequencialDocumento : Number.MAX_SAFE_INTEGER;
    validos.push({ titulo, tipo, url, ordem: ORDEM_TIPO[tipoId] ?? 2, seq });
  }
  return validos.sort((x, y) => x.ordem - y.ordem || x.seq - y.seq).map(({ titulo, tipo, url }) => ({ titulo, tipo, url }));
}
