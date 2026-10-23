import type { Fonte } from './tipos';

/**
 * Valores da Lei 14.133/2021 atualizados por decreto todo ano (art. 182). Só aqui: os guias usam estes valores.
 * Ao virar o ano, trocar decreto, vigência e valores pelo novo decreto (conferido no Planalto) e rever os guias.
 */
export const DECRETO_VALORES = {
  nome: 'Decreto nº 12.807, de 29 de dezembro de 2025',
  vigenciaDesde: '2026-01-01',
  fonte: {
    nome: 'Decreto nº 12.807/2025 (Planalto)',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/D12807.htm',
  } satisfies Fonte,
} as const;

export const VALORES = {
  /** Art. 75, I: dispensa por valor para obras, serviços de engenharia e manutenção de veículos. */
  dispensaObras: 'R$ 130.984,20',
  /** Art. 75, II: dispensa por valor para compras e outros serviços. */
  dispensaCompras: 'R$ 65.492,11',
  /** Art. 75, § 7º: serviços de manutenção de veículos do órgão, com as peças, fora da soma anual do § 1º (dispensa). */
  dispensaPecasVeiculos: 'R$ 10.478,74',
  /** Art. 95, § 2º: contrato verbal (pequenas compras de pronto pagamento). */
  contratoVerbal: 'R$ 13.098,41',
  /** Art. 6º, XXII: contratação de grande vulto. */
  grandeVulto: 'R$ 261.968.421,04',
} as const;
