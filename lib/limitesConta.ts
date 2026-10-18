/**
 * Plano da conta e limites (Evolução, Fase 4, §1, com a decisão do dono depois da spec: o Basic acabou, só Grátis e
 * Pro). Grátis: nenhum salvo, nenhum alerta, sem resumo semanal (os botões mostram o convite ao Pro). Pro: até 5
 * alertas e salvos com uso justo (500 por trás). Descartados não contam como salvos (teto próprio de 500 no banco,
 * gravar_salvo). Linhas antigas com 'basic' (perfis ou assinatura) valem como Pro até o fim da validade.
 * Puro: o site e o job dos alertas usam.
 */
export type NivelConta = 'gratis' | 'pro';

export const LIMITES_CONTA: Record<NivelConta, { salvos: number; alertas: number }> = {
  gratis: { salvos: 0, alertas: 0 },
  pro: { salvos: 500, alertas: 5 },
};

export function lerPlano(v: unknown): NivelConta {
  return v === 'pro' || v === 'basic' ? 'pro' : 'gratis';
}

/** O maior plano entre as fontes (marcação manual, assinatura com o e-mail da conta, navegador). */
export function maiorPlano(...planos: NivelConta[]): NivelConta {
  return planos.includes('pro') ? 'pro' : 'gratis';
}

/** `daConta`: perfis.plano + assinatura com o e-mail da conta (o que os envios por e-mail veem). `doNavegador`: Cakto por navegador. */
export type PlanoConta = { plano: NivelConta; daConta: NivelConta; doNavegador: NivelConta };

export const AVISO_PLANO_NAVEGADOR = 'Plano no navegador, não na conta: use o mesmo e-mail da compra.';

/** Assinou com outro e-mail: o Pro vale neste navegador, mas os envios por e-mail (sem navegador) não o veem. */
export function avisoPlanoNavegador(p: PlanoConta): string | null {
  return p.doNavegador === 'pro' && p.daConta !== 'pro' ? AVISO_PLANO_NAVEGADOR : null;
}

export type Bloqueio = { codigo: 'plano' | 'limite'; mensagem: string };

export const MENSAGENS_LIMITE_CONTA = {
  salvosPlano: 'Salvar editais é do plano Pro.',
  alertasPlano: 'Alertas por e-mail são do plano Pro.',
  resumoPlano: 'O resumo semanal é do plano Pro.',
  salvosConvite: 'No Pro, salve os editais que interessam e acompanhe cada um com status e observação.',
  alertasConvite: 'No Pro, até 5 alertas: os editais novos chegam por e-mail às 7h, e toda segunda chega o resumo da semana.',
} as const;

/** Pode salvar mais um? `usados` = salvos fora os descartados. */
export function bloqueioSalvar(plano: NivelConta, usados: number): Bloqueio | null {
  const max = LIMITES_CONTA[plano].salvos;
  if (max === 0) return { codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.salvosPlano };
  return usados < max ? null : { codigo: 'limite', mensagem: `Você chegou a ${max} editais salvos. Remova um para salvar outro.` };
}

/** Pode criar mais um alerta? `qtd` = alertas da conta (pausados contam). */
export function bloqueioAlerta(plano: NivelConta, qtd: number): Bloqueio | null {
  const max = LIMITES_CONTA[plano].alertas;
  if (max === 0) return { codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.alertasPlano };
  return qtd < max ? null : { codigo: 'limite', mensagem: `Você já tem ${max} alertas, o máximo do plano. Pause ou exclua um para criar outro.` };
}
