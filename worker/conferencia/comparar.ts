import { contratacaoParaLinha, type LinhaContratacao } from '../mapear';
import { validarContratacao } from '../pncp/esquemas';

export type Diferenca = { campo: string; banco: string; pncp: string };
export type ResultadoCompra = {
  id: string;
  status: 'ok' | 'divergente' | 'desatualizada' | 'erro';
  diferencas: Diferenca[];
  observacao?: string;
};

const CAMPOS = [
  'objeto',
  'valor_estimado',
  'encerramento_em',
  'modalidade_id',
  'situacao_id',
  'codigo_ibge',
  'uf',
  'srp',
] as const;

function normalizar(campo: (typeof CAMPOS)[number], valor: unknown): string {
  if (valor === null || valor === undefined) return '∅';
  if (campo === 'encerramento_em') return new Date(valor as string).toISOString();
  if (campo === 'valor_estimado') return String(Number(valor));
  return String(valor).trim();
}

export function compararCompra(
  banco: LinhaContratacao,
  detalheBruto: unknown,
  itensBanco: number,
  itensPncp: number,
): ResultadoCompra {
  const v = validarContratacao(detalheBruto);
  if (!v.ok) return { id: banco.id, status: 'erro', diferencas: [], observacao: `detalhe inválido: ${v.motivo}` };
  const pncp = contratacaoParaLinha(v.valor);
  const diferencas: Diferenca[] = [];
  for (const campo of CAMPOS) {
    const a = normalizar(campo, banco[campo]);
    const b = normalizar(campo, pncp[campo]);
    if (a !== b) diferencas.push({ campo, banco: a, pncp: b });
  }
  if (itensBanco !== itensPncp) diferencas.push({ campo: 'qtd_itens', banco: String(itensBanco), pncp: String(itensPncp) });
  if (Date.parse(pncp.atualizada_pncp_em) > Date.parse(banco.atualizada_pncp_em)) {
    return {
      id: banco.id,
      status: 'desatualizada',
      diferencas,
      observacao: 'O PNCP mudou a compra depois da última sincronização',
    };
  }
  return { id: banco.id, status: diferencas.length > 0 ? 'divergente' : 'ok', diferencas };
}
