import type { Resultado } from '../eventos';
import { data, hora, numero } from '../formato';
import { linhaDoRadar, radarDaLinha, validarRadar, type Radar } from '../radar';

/**
 * Alertas da conta (Evolução, Fase 4, §3): os mesmos filtros e validações do radar (lib/radar.ts) + um nome. Puro: o
 * site e o job dos alertas usam; o dono vem só da sessão (lib/servidor/alertas.ts) ou do banco (job).
 */

export type Alerta = Radar & { nome: string };
export type AlertaDaConta = Alerta & { id: string; ativo: boolean; criadoEm: string; ultimoEnvioEm: string | null };

export const STATUS_ENVIO = ['enviado', 'sem_novidades', 'falhou', 'pulado_plano'] as const;
export type StatusEnvio = (typeof STATUS_ENVIO)[number];
export type UltimoEnvio = { status: StatusEnvio; em: string; qtd: number };

export const MAX_NOME_ALERTA = 60;
export const ID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const MENSAGENS_ALERTA = {
  formulario: 'Formulário inválido.',
  nome: 'Dê um nome ao alerta, com até 60 caracteres.',
  entrar: 'Entre para criar alertas.',
  naoEncontrado: 'Alerta não encontrado.',
  falha: 'Não foi possível salvar o alerta agora. Tente de novo.',
} as const;

export const AVISO_ENVIO_INDISPONIVEL = 'Envio indisponível agora. Tentamos de novo amanhã às 7h.';

/** Mensagem do gatilho da 0018 (alertas_teto): a conta já tem o máximo de alertas (corrida entre dois pedidos). */
export const ERRO_TETO_ALERTAS = 'alertas_teto';

/** O banco recusou o alerta pelo teto (0018); a rota responde o mesmo 402 `limite` da conferência de antes. */
export class TetoDeAlertas extends Error {
  constructor() {
    super(ERRO_TETO_ALERTAS);
    this.name = 'TetoDeAlertas';
  }
}

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
// Tab e quebra de linha viram espaço antes (\s); o resto (NUL, ESC, DEL...) o Postgres recusaria ou ninguém digita.
const CONTROLE = /[\u0000-\u001f\u007f]/;

/** Nome sugerido: os produtos separados por vírgula, até 60 caracteres. */
export function nomePadrao(termos: readonly string[]): string {
  const t = termos.join(', ');
  return t.length <= MAX_NOME_ALERTA ? t : `${t.slice(0, MAX_NOME_ALERTA - 1).trimEnd()}…`.slice(0, MAX_NOME_ALERTA);
}

/** Alerta diário que o onboarding cria junto com o radar: os mesmos filtros, com o nome dos produtos. */
export function alertaDoRadar(radar: Radar): Alerta {
  return { ...radar, nome: nomePadrao(radar.termos) };
}

/** Corpo de criação/edição: nome + os campos do radar (validarRadar). Um user_id no corpo é ignorado. */
export function validarAlerta(corpo: unknown): Resultado<Alerta> {
  if (!objeto(corpo)) return { ok: false, erro: MENSAGENS_ALERTA.formulario };
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim().replace(/\s+/g, ' ') : '';
  if (!nome || nome.length > MAX_NOME_ALERTA || CONTROLE.test(nome)) return { ok: false, erro: MENSAGENS_ALERTA.nome };
  const radar = validarRadar(corpo);
  if (!radar.ok) return radar;
  return { ok: true, valor: { ...radar.valor, nome } };
}

export type MudancaAlerta = { tipo: 'ativo'; ativo: boolean } | { tipo: 'alerta'; alerta: Alerta };

/** PATCH: só { ativo: boolean } pausa ou retoma (só `ativo` e não booleano: formulário inválido); o resto é a edição completa. */
export function validarMudancaAlerta(corpo: unknown): Resultado<MudancaAlerta> {
  if (objeto(corpo) && Object.keys(corpo).length === 1 && 'ativo' in corpo) {
    return typeof corpo.ativo === 'boolean'
      ? { ok: true, valor: { tipo: 'ativo', ativo: corpo.ativo } }
      : { ok: false, erro: MENSAGENS_ALERTA.formulario };
  }
  const v = validarAlerta(corpo);
  return v.ok ? { ok: true, valor: { tipo: 'alerta', alerta: v.valor } } : v;
}

export function lerIdAlerta(v: unknown): string | null {
  return typeof v === 'string' && ID_UUID.test(v) ? v : null;
}

/** Linha de public.alertas (numeric chega como texto) → alerta. */
export function alertaDaLinha(l: Record<string, unknown>): AlertaDaConta {
  return {
    ...radarDaLinha(l),
    nome: String(l.nome ?? ''),
    id: String(l.id),
    ativo: l.ativo !== false,
    criadoEm: String(l.criado_em),
    ultimoEnvioEm: l.ultimo_envio_em ? String(l.ultimo_envio_em) : null,
  };
}

/** Alerta → colunas de public.alertas (sem user_id: quem põe é lib/servidor/alertas.ts, da sessão). */
export function linhaDoAlerta(a: Alerta): Record<string, unknown> {
  return { ...linhaDoRadar(a), nome: a.nome };
}

/** "Último envio" na lista de /alertas. */
export function textoUltimoEnvio(u: UltimoEnvio | null): string {
  if (!u) return 'Ainda sem envio. O primeiro sai às 7h, se houver editais novos.';
  const quando = `${data(u.em)} às ${hora(u.em)}`;
  switch (u.status) {
    case 'enviado':
      return `Último envio ${quando}: ${u.qtd === 1 ? '1 edital' : `${numero(u.qtd)} editais`}.`;
    case 'sem_novidades':
      return `Sem editais novos em ${quando}.`;
    case 'falhou':
      return `O envio de ${quando} falhou. Tentamos de novo às 7h.`;
    case 'pulado_plano':
      return `Não enviado em ${quando}: alertas por e-mail são do plano Pro.`;
  }
}

export function envioIndisponivel(ultimos: readonly (UltimoEnvio | null)[]): boolean {
  return ultimos.some((u) => u?.status === 'falhou');
}
