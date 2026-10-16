import { somarDias } from './datas';
export const MODALIDADES = [6, 8, 4, 7, 12] as const;
export const PARALELISMO = 3;
export const TENTATIVAS = 4;
export const TIMEOUT_MS = 30_000;
export const PAGINA_CONTRATACOES = 50;
export const PAGINA_ITENS = 50;
/** Teto de páginas de itens por compra (50 × 200 = 10.000 itens); passou disso, o PNCP não está paginando. */
export const MAX_PAGINAS_ITENS = 200;
export const LOTE_BANCO = 500;
export const LIMITE_CATCH_UP = 300;
export const LIMITE_INVALIDOS = 0.05;
/** Contratação encerrada há mais que isso (ou sem prazo) não é gravada e sai do banco no job diário de retenção. */
export const RETENCAO_DIAS = 7;
export const BASE_CONSULTA = 'https://pncp.gov.br/api/consulta';
export const BASE_PNCP = 'https://pncp.gov.br/api/pncp';
/** Chamadas por minuto à API de consulta do PNCP (medido: 20/min sem 429; 30/min já dá 429). */
export const CONSULTA_POR_MINUTO = 20;
/** Quantas chamadas à consulta podem sair seguidas antes de o ritmo valer (medido: o PNCP corta em ~12). */
export const CONSULTA_RAJADA = 10;
/** Esperas depois de um HTTP 429 (o bloqueio dura ~25 s). Erros 5xx e timeout continuam com 2, 4 e 8 s. */
export const ESPERAS_429_MS = [30_000, 60_000, 120_000] as const;

export const UFS_BRASIL = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

/** UFS vazio ou "BR" = país inteiro numa consulta só (sem `uf` no PNCP). Chave de estado: atualizacao:BR:<modalidade>. */
export const UF_BRASIL = 'BR';

export function lerUfs(valor: string | undefined): string[] {
  const ufs = [
    ...new Set(
      (valor ?? '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (ufs.length === 0 || (ufs.length === 1 && ufs[0] === UF_BRASIL)) return [UF_BRASIL];
  for (const uf of ufs) {
    if (uf === UF_BRASIL) throw new Error('BR (país inteiro) não se mistura com UFs');
    if (!(UFS_BRASIL as readonly string[]).includes(uf)) throw new Error(`UF inválida: ${uf}`);
  }
  return ufs;
}

export function lerPorMinuto(valor: string | undefined): number {
  if (!valor?.trim()) return CONSULTA_POR_MINUTO;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 600) throw new Error(`PNCP_CONSULTA_POR_MINUTO inválido: ${valor}`);
  return n;
}

export function lerModalidades(valor: string | undefined): number[] {
  if (!valor?.trim()) return [...MODALIDADES];
  const modalidades = valor.split(',').map((s) => Number(s.trim()));
  for (const m of modalidades) {
    if (!(MODALIDADES as readonly number[]).includes(m)) throw new Error(`Modalidade fora da v1: ${m}`);
  }
  return modalidades;
}

export function lerSupabase(env: Record<string, string | undefined> = process.env): { url: string; chave: string } {
  const url = env.SUPABASE_URL;
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (arquivo .env ou Secrets do GitHub).');
  }
  return { url, chave };
}

/** Quantos dias à frente vai o dataFinal do /proposta na carga e na conferência (a Task 16 confere contra hoje). */
export const PROPOSTA_DIAS_A_FRENTE = 365;

export function lerPropostaAte(valor: string | undefined, hoje: string): string {
  if (!valor?.trim()) return somarDias(hoje, PROPOSTA_DIAS_A_FRENTE);
  const data = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(`--proposta-ate inválido (use aaaa-mm-dd): ${valor}`);
  return data;
}
