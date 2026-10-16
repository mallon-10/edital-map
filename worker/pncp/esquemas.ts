import { z } from 'zod';

export const esquemaContratacao = z
  .object({
    numeroControlePNCP: z.string().min(1),
    anoCompra: z.number().int(),
    sequencialCompra: z.number().int(),
    objetoCompra: z.string(),
    informacaoComplementar: z.string().nullish(),
    orgaoEntidade: z.object({
      cnpj: z.string().min(1),
      razaoSocial: z.string(),
      esferaId: z.string().nullish(),
    }),
    unidadeOrgao: z.object({
      ufSigla: z.string().length(2),
      municipioNome: z.string().nullish(),
      nomeUnidade: z.string().nullish(),
      codigoIbge: z.union([z.string(), z.number()]).nullish(),
    }),
    modalidadeId: z.number().int(),
    modalidadeNome: z.string().nullish(),
    situacaoCompraId: z.number().int().nullish(),
    situacaoCompraNome: z.string().nullish(),
    srp: z.boolean().nullish(),
    valorTotalEstimado: z.number().nullish(),
    valorTotalHomologado: z.number().nullish(),
    dataPublicacaoPncp: z.string().nullish(),
    dataAberturaProposta: z.string().nullish(),
    dataEncerramentoProposta: z.string().nullish(),
    linkSistemaOrigem: z.string().nullish(),
    dataAtualizacaoGlobal: z.string().nullish(),
    dataAtualizacao: z.string().nullish(),
  })
  .refine((c) => Boolean(c.dataAtualizacaoGlobal?.trim() || c.dataAtualizacao?.trim()), {
    message: 'sem dataAtualizacaoGlobal nem dataAtualizacao',
  });
export type ContratacaoPncp = z.infer<typeof esquemaContratacao>;

export const esquemaItem = z.object({
  numeroItem: z.number().int(),
  descricao: z.string(),
  quantidade: z.number().nullish(),
  unidadeMedida: z.string().nullish(),
  valorUnitarioEstimado: z.number().nullish(),
  valorTotal: z.number().nullish(),
  materialOuServico: z.string().nullish(),
  orcamentoSigiloso: z.boolean().nullish(),
  temResultado: z.boolean().nullish(),
  tipoBeneficio: z.number().int().nullish(),
  tipoBeneficioNome: z.string().nullish(),
  criterioJulgamentoNome: z.string().nullish(),
});
export type ItemPncp = z.infer<typeof esquemaItem>;

export type Validado<T> = { ok: true; valor: T } | { ok: false; id: string; motivo: string };

function motivo(erro: z.ZodError): string {
  return erro.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`).join('; ');
}

export function validarContratacao(bruto: unknown): Validado<ContratacaoPncp> {
  const r = esquemaContratacao.safeParse(bruto);
  if (r.success) return { ok: true, valor: r.data };
  const id = (bruto as { numeroControlePNCP?: unknown } | null)?.numeroControlePNCP;
  return {
    ok: false,
    id: typeof id === 'string' && id ? id : '(sem numeroControlePNCP)',
    motivo: motivo(r.error),
  };
}

export function validarItem(bruto: unknown, contratacaoId: string): Validado<ItemPncp> {
  const r = esquemaItem.safeParse(bruto);
  if (r.success) return { ok: true, valor: r.data };
  const numero = (bruto as { numeroItem?: unknown } | null)?.numeroItem;
  return { ok: false, id: `${contratacaoId}#${String(numero ?? '?')}`, motivo: motivo(r.error) };
}
