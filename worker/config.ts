export const MODALIDADES = [6, 8, 4, 7, 12] as const;
export const PARALELISMO = 3;
export const TENTATIVAS = 4;
export const TIMEOUT_MS = 30_000;
export const PAGINA_CONTRATACOES = 50;
export const PAGINA_ITENS = 50;
export const LOTE_BANCO = 500;
export const LIMITE_CATCH_UP = 300;
export const LIMITE_INVALIDOS = 0.05;
export const BASE_CONSULTA = 'https://pncp.gov.br/api/consulta';
export const BASE_PNCP = 'https://pncp.gov.br/api/pncp';

export const UFS_BRASIL = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

export function lerUfs(valor: string | undefined): string[] {
  const texto = valor?.trim() ? valor : 'SC,PR,RS';
  const ufs = texto
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  for (const uf of ufs) {
    if (!(UFS_BRASIL as readonly string[]).includes(uf)) throw new Error(`UF inválida: ${uf}`);
  }
  return [...new Set(ufs)];
}

export function lerModalidades(valor: string | undefined): number[] {
  if (!valor?.trim()) return [...MODALIDADES];
  const modalidades = valor.split(',').map((s) => Number(s.trim()));
  for (const m of modalidades) {
    if (!(MODALIDADES as readonly number[]).includes(m)) throw new Error(`Modalidade fora da v1: ${m}`);
  }
  return modalidades;
}

export function lerSupabase(env: NodeJS.ProcessEnv = process.env): { url: string; chave: string } {
  const url = env.SUPABASE_URL;
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (arquivo .env ou Secrets do GitHub).');
  }
  return { url, chave };
}
