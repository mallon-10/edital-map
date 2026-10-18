import type { SupabaseClient } from '@supabase/supabase-js';
import type { EditalDoEmail } from '../../lib/alertas/email';
import type { StatusEnvio } from '../../lib/alertas/regras';
import { lerPlano, type NivelConta } from '../../lib/limitesConta';
import { filtrosDoRadar, radarDaLinha, type Radar } from '../../lib/radar';

/** O que o job dos alertas lê e grava (service role, funções da 0016). Sem e-mail em log nem em evento. */

export type AlertaParaEnvio = {
  id: string;
  userId: string;
  email: string;
  plano: NivelConta;
  nome: string;
  radar: Radar;
  ultimoEnvioEm: string | null;
  criadoEm: string;
};
export type EditalAlerta = EditalDoEmail & { id: string };
export type RegistroEnvio = {
  alertaId: string;
  status: StatusEnvio;
  qtd: number;
  tentativas: number;
  erro?: string | null;
  idMensagem?: string | null;
  ids?: string[];
  selecionadoEm: string;
  avancar?: boolean;
  /**
   * Alerta nunca enviado que ficou com sobra (avancar falso): a janela que o job usou. Gravada em ultimo_envio_em (só se
   * ainda nulo) antes do registro, porque o fallback de registrar_envio_alerta (selecionado − 24 h) perderia a sobra
   * mais antiga. Sem migração: a 0016 já está no ar.
   */
  janelaInicial?: string;
};

/** O job não tem navegador: os eventos dele usam este visitante fixo. */
export const VISITANTE_JOB = '00000000-0000-4000-8000-000000000001';

export interface BancoAlertas {
  alertasParaEnvio(): Promise<AlertaParaEnvio[]>;
  /** Contas distintas com alerta aceito pelo Resend desde `desde` (o teto do dia desconta uma rodada refeita). */
  emailsDeAlertasHoje(desde: string): Promise<number>;
  editaisDoAlerta(a: AlertaParaEnvio, desde: string, limite: number): Promise<{ editais: EditalAlerta[]; total: number }>;
  registrarEnvio(r: RegistroEnvio): Promise<void>;
  gravarEventoEnvio(detalhe: { qtd: number; alertas: number }): Promise<void>;
}

export function alertaDaLinhaEnvio(l: Record<string, unknown>): AlertaParaEnvio {
  return {
    id: String(l.alerta_id),
    userId: String(l.user_id),
    email: String(l.email),
    plano: lerPlano(l.plano),
    nome: String(l.nome),
    radar: radarDaLinha(l),
    ultimoEnvioEm: l.ultimo_envio_em ? String(l.ultimo_envio_em) : null,
    criadoEm: String(l.criado_em),
  };
}

/** Linha de editais_do_alerta ou de um item do resumo (numeric pode chegar como texto) → edital do e-mail. */
export function editalDaLinha(l: Record<string, unknown>): EditalAlerta {
  return {
    id: String(l.id),
    slug: String(l.slug),
    objeto: String(l.objeto),
    orgao_nome: String(l.orgao_nome),
    municipio_nome: l.municipio_nome === null || l.municipio_nome === undefined ? null : String(l.municipio_nome),
    uf: String(l.uf),
    valor_estimado: l.valor_estimado === null || l.valor_estimado === undefined ? null : Number(l.valor_estimado),
    encerramento_em: String(l.encerramento_em),
    situacao_id: l.situacao_id === null || l.situacao_id === undefined ? null : Number(l.situacao_id),
  };
}

const falhar = (contexto: string, erro: { message: string } | null) => {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
};

/**
 * E-mails de alertas aceitos desde `desde`: contas distintas com envio 'enviado' em envios_alerta (uma linha por alerta,
 * um e-mail por conta e por rodada). Os dois modos usam: o teto dos alertas e o do resumo. O limit explícito passa do
 * teto de linhas padrão da API (60 contas × 5 alertas por rodada, poucas rodadas por dia).
 */
export async function contarEmailsDeAlertas(sb: SupabaseClient, desde: string): Promise<number> {
  const { data, error } = await sb.from('envios_alerta').select('user_id').eq('status', 'enviado').gte('iniciado_em', desde).limit(10000);
  falhar('envios_alerta de hoje', error);
  return new Set(((data ?? []) as Array<{ user_id: unknown }>).map((l) => String(l.user_id))).size;
}

export function criarBancoAlertas(sb: SupabaseClient): BancoAlertas {
  return {
    async alertasParaEnvio() {
      const { data, error } = await sb.rpc('alertas_para_envio');
      falhar('alertas_para_envio', error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(alertaDaLinhaEnvio);
    },
    emailsDeAlertasHoje: (desde) => contarEmailsDeAlertas(sb, desde),
    async editaisDoAlerta(a, desde, limite) {
      const { data, error } = await sb.rpc('editais_do_alerta', { p_alerta: a.id, p_desde: desde, ...filtrosDoRadar(a.radar), p_limite: limite });
      falhar('editais_do_alerta', error);
      const linhas = (data ?? []) as Array<Record<string, unknown>>;
      return { total: Number(linhas[0]?.total ?? 0), editais: linhas.map(editalDaLinha) };
    },
    async registrarEnvio(r) {
      // falhou, sem_novidades e pulado_plano não gravam alertas_enviados nem mexem na janela (registrar_envio_alerta).
      if (r.status === 'enviado' && r.janelaInicial) {
        const fixar = await sb.from('alertas').update({ ultimo_envio_em: r.janelaInicial }).eq('id', r.alertaId).is('ultimo_envio_em', null);
        falhar('janela inicial do alerta', fixar.error);
      }
      const { error } = await sb.rpc('registrar_envio_alerta', {
        p_alerta: r.alertaId, p_status: r.status, p_qtd: r.qtd, p_tentativas: r.tentativas, p_erro: r.erro ?? null,
        p_id_mensagem: r.idMensagem ?? null, p_ids: r.ids ?? null, p_selecionado_em: r.selecionadoEm, p_avancar: r.avancar ?? true,
      });
      falhar('registrar_envio_alerta', error);
    },
    async gravarEventoEnvio(detalhe) {
      const { error } = await sb.from('eventos').insert({ visitante: VISITANTE_JOB, tipo: 'alerta_enviado', detalhe, interno: false });
      falhar('evento alerta_enviado', error);
    },
  };
}
