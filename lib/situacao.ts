/** Situação da contratação no PNCP (situacaoCompraId). */
export const SITUACAO = { divulgada: 1, revogada: 2, anulada: 3, suspensa: 4 } as const;

/** Situações que tiram o edital das abertas (public.em_aberto, 0011; guarda em scripts/migracoes.test.ts). */
export const SITUACOES_FORA_DAS_ABERTAS = [SITUACAO.revogada, SITUACAO.anulada] as const;

export const AVISO_SUSPENSA = 'O órgão suspendeu esta licitação; confira o edital oficial antes de se preparar.';

export function rotuloSituacao(id: number | null): 'Suspensa' | 'Revogada' | 'Anulada' | null {
  if (id === SITUACAO.suspensa) return 'Suspensa';
  if (id === SITUACAO.revogada) return 'Revogada';
  if (id === SITUACAO.anulada) return 'Anulada';
  return null;
}

/** Aviso da página do edital (revogada e anulada só chegam lá por link direto: saem da lista, do mapa e dos parecidos). */
export function avisoSituacao(id: number | null): string | null {
  if (id === SITUACAO.suspensa) return AVISO_SUSPENSA;
  if (id === SITUACAO.revogada) return 'O órgão revogou esta licitação: ela não está mais aberta.';
  if (id === SITUACAO.anulada) return 'O órgão anulou esta licitação: ela não está mais aberta.';
  return null;
}
