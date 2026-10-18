import type { SupabaseClient } from '@supabase/supabase-js';
import { montarResumo, resumoDaResposta, temNovidade, type ResumoSemanal } from '../../lib/alertas/resumo';
import { criarTokenDescadastro } from '../../lib/alertas/token';
import { filtrosDoRadar, radarDaLinha, type Radar } from '../../lib/radar';
import { hojeBrasilia, inicioDoDia } from '../datas';
import { VISITANTE_JOB } from './banco';
import { chaveIdempotencia, ESPERAS_REGISTRO_MS, MAX_EMAILS_POR_RODADA, mensagemDeErro, motivoSemEnvio, PAUSA_ENTRE_EMAILS_MS, type DepsEnvio } from './executar';
import { curto, limparLog } from './log';

/**
 * Resumo semanal do Pro (segunda, 10:00 UTC = 7h em Brasília, depois dos alertas): para cada conta Pro (plano da conta
 * no momento do envio) com Meu Radar e o resumo ligado, que não recebeu resumo nos últimos 6 dias (contas_para_resumo,
 * 0016), o resumo da semana; sem novidade não manda (sem_novidades). Histórico em envios_resumo; descadastro pelo link
 * (token "r"). Cota do Resend (100/dia, dividida com os códigos de login): o resumo usa no máximo 60 menos os e-mails
 * que os alertas já mandaram hoje (dia de Brasília); quem passa do teto ou fica depois de uma cota esgotada não é
 * registrado e entra na próxima segunda. Logs públicos (repositório aberto): sem e-mail, sem token, ids com 8 caracteres.
 */

export type ContaResumo = { userId: string; email: string; radar: Radar };
export type RegistroResumo = {
  userId: string;
  status: 'enviado' | 'sem_novidades' | 'falhou';
  qtd: number;
  tentativas: number;
  erro?: string | null;
  idMensagem?: string | null;
  iniciadoEm: string;
};

export interface BancoResumo {
  contasParaResumo(): Promise<ContaResumo[]>;
  /** Contas distintas com alerta aceito pelo Resend desde `desde` (um e-mail de alertas por conta e por rodada). */
  emailsDeAlertasHoje(desde: string): Promise<number>;
  resumoDaConta(c: ContaResumo): Promise<ResumoSemanal | null>;
  registrarResumo(r: RegistroResumo): Promise<void>;
  gravarEventoResumo(detalhe: { novas: number; prazo: number }): Promise<void>;
}

const falhar = (contexto: string, erro: { message: string } | null) => {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
};

export function criarBancoResumo(sb: SupabaseClient): BancoResumo {
  return {
    async contasParaResumo() {
      const { data, error } = await sb.rpc('contas_para_resumo');
      falhar('contas_para_resumo', error);
      return ((data ?? []) as Array<Record<string, unknown>>).map((l) => ({ userId: String(l.user_id), email: String(l.email), radar: radarDaLinha(l) }));
    },
    async emailsDeAlertasHoje(desde) {
      // Uma linha por alerta enviado; o e-mail é um por conta. No máximo 60 contas × 5 alertas: cabe numa página.
      const { data, error } = await sb.from('envios_alerta').select('user_id').eq('status', 'enviado').gte('iniciado_em', desde);
      falhar('envios_alerta de hoje', error);
      return new Set(((data ?? []) as Array<{ user_id: unknown }>).map((l) => String(l.user_id))).size;
    },
    async resumoDaConta(c) {
      const { data, error } = await sb.rpc('resumo_do_radar', { p_user: c.userId, ...filtrosDoRadar(c.radar) });
      falhar('resumo_do_radar', error);
      return resumoDaResposta(data);
    },
    async registrarResumo(r) {
      const { error } = await sb.from('envios_resumo').insert({
        user_id: r.userId, status: r.status, qtd_editais: r.qtd, tentativas: r.tentativas, erro: r.erro ?? null, id_mensagem: r.idMensagem ?? null, iniciado_em: r.iniciadoEm,
      });
      falhar('envios_resumo', error);
    },
    async gravarEventoResumo(detalhe) {
      const { error } = await sb.from('eventos').insert({ visitante: VISITANTE_JOB, tipo: 'resumo_enviado', detalhe, interno: false });
      falhar('evento resumo_enviado', error);
    },
  };
}

export type ResultadoResumo = {
  contas: number;
  emails: number;
  enviados: number;
  semNovidades: number;
  falhas: number;
  /** Contas deixadas para a próxima segunda (teto ou cota esgotada), sem registro. */
  adiados: number;
  cotaEsgotada: boolean;
  /** Aceitos pelo Resend cujo registro não gravou (ACEITO_SEM_REGISTRO no log). */
  aceitosSemRegistro: number;
  /** E-mails de alertas aceitos hoje (dia de Brasília), antes desta rodada. */
  alertasHoje: number;
  /** Quantos e-mails o resumo podia mandar nesta rodada. */
  teto: number;
};

/** O resumo divide os 60 por dia com os alertas (que rodam antes, na mesma manhã). */
export const tetoDoResumo = (alertasHoje: number) => Math.max(0, MAX_EMAILS_POR_RODADA - alertasHoje);

/** Anotações do GitHub Actions no fim da rodada (só contagens). Adiar sozinho é aviso, não falha (código de saída 0). */
export function avisosDoResumoSemanal(r: ResultadoResumo): string[] {
  const avisos: string[] = [];
  if (r.cotaEsgotada) avisos.push(`::warning::Cota do Resend esgotada: ${r.adiados} contas ficaram para a próxima segunda`);
  else if (r.adiados > 0) {
    avisos.push(
      `::warning::Teto do resumo atingido (${r.teto} e-mails; os alertas de hoje usaram ${r.alertasHoje} de ${MAX_EMAILS_POR_RODADA}): ${r.adiados} contas ficaram para a próxima segunda`,
    );
  }
  if (r.aceitosSemRegistro > 0) {
    avisos.push(`::error::${r.aceitosSemRegistro} resumos enviados sem registro (podem repetir se a rodada for refeita): procure ACEITO_SEM_REGISTRO no log`);
  }
  return avisos;
}

export async function executarResumo(d: DepsEnvio & { banco: BancoResumo }): Promise<ResultadoResumo> {
  const log = (linha: string) => d.log(limparLog(linha));
  const contas = await d.banco.contasParaResumo();
  const alertasHoje = await d.banco.emailsDeAlertasHoje(inicioDoDia(hojeBrasilia(d.agora())));
  const r: ResultadoResumo = {
    contas: contas.length, emails: 0, enviados: 0, semNovidades: 0, falhas: 0, adiados: 0, cotaEsgotada: false, aceitosSemRegistro: 0,
    alertasHoje, teto: tetoDoResumo(alertasHoje),
  };
  log(`[resumo] alertas de hoje: ${alertasHoje} e-mails; teto do resumo nesta rodada: ${r.teto}`);
  const semEnvio = motivoSemEnvio(d);
  if (semEnvio) log(`[resumo] envio desligado: ${semEnvio}; os resumos com novidade ficam como falhou`);
  let aceitos = 0;

  for (const [i, c] of contas.entries()) {
    // Só conta o que o Resend confirmou (a folga de 40 por dia cobre um aceite que voltou como erro).
    if (r.cotaEsgotada || aceitos >= r.teto) {
      r.adiados = contas.length - i;
      break;
    }
    const iniciadoEm = d.agora().toISOString();
    let aceito = false;
    try {
      const resumo = await d.banco.resumoDaConta(c);
      if (!resumo || !temNovidade(resumo)) {
        await d.banco.registrarResumo({ userId: c.userId, status: 'sem_novidades', qtd: 0, tentativas: 0, iniciadoEm });
        r.semNovidades++;
        continue;
      }
      if (semEnvio || !d.enviar || !d.segredo) {
        await d.banco.registrarResumo({ userId: c.userId, status: 'falhou', qtd: resumo.novas, tentativas: 0, erro: semEnvio ?? 'envio indisponível', iniciadoEm });
        r.falhas++;
        continue;
      }
      // criarTokenDescadastro normaliza o segredo (lerSegredo), igual à leitura em /alertas/sair.
      const email = montarResumo(resumo, criarTokenDescadastro({ tipo: 'resumo', conta: c.userId }, d.segredo));
      const ids = [...resumo.novos, ...resumo.encerrando].map((e) => e.id).concat(iniciadoEm.slice(0, 10));
      if (r.emails > 0) await d.esperar(PAUSA_ENTRE_EMAILS_MS);
      r.emails++;
      const envio = await d.enviar({ para: c.email, ...email, idempotencia: chaveIdempotencia('resumo', c.userId, ids) });
      if (!envio.ok) {
        // Cota esgotada: marca antes de gravar, para a rodada parar mesmo se o registro falhar.
        if (envio.cotaEsgotada) r.cotaEsgotada = true;
        log(`[resumo] conta ${curto(c.userId)}: ${envio.erro}`);
        await d.banco.registrarResumo({ userId: c.userId, status: 'falhou', qtd: resumo.novas, tentativas: envio.tentativas, erro: envio.erro, iniciadoEm });
        r.falhas++;
        continue;
      }
      // Aceito: o e-mail saiu. Daqui em diante nada vira falhou; o registro tem nova tentativa.
      aceitos++;
      aceito = true;
      const registro: RegistroResumo = { userId: c.userId, status: 'enviado', qtd: resumo.novas, tentativas: envio.tentativas, idMensagem: envio.id, iniciadoEm };
      let gravou = false;
      for (let tentativa = 0; !gravou; tentativa++) {
        try {
          await d.banco.registrarResumo(registro);
          gravou = true;
        } catch (erro) {
          if (tentativa >= ESPERAS_REGISTRO_MS.length) {
            log(`[resumo] registro da conta ${curto(c.userId)}: ${mensagemDeErro(erro)}`);
            break;
          }
          await d.esperar(ESPERAS_REGISTRO_MS[tentativa]);
        }
      }
      if (gravou) r.enviados++;
      else {
        // Marcador fixo para procurar no log público: o e-mail saiu, mas envios_resumo não gravou.
        log(`[resumo] ACEITO_SEM_REGISTRO conta ${curto(c.userId)} msg ${curto(envio.id)} qtd ${resumo.novas}`);
        r.aceitosSemRegistro++;
        r.falhas++;
      }
      try {
        await d.banco.gravarEventoResumo({ novas: resumo.novas, prazo: resumo.prazoProximo });
      } catch (erro) {
        log(`[resumo] evento: ${mensagemDeErro(erro)}`);
      }
    } catch (erro) {
      log(`[resumo] conta ${curto(c.userId)}: ${mensagemDeErro(erro)}`);
      r.falhas++;
      if (aceito) continue;
      try {
        await d.banco.registrarResumo({ userId: c.userId, status: 'falhou', qtd: 0, tentativas: 0, erro: mensagemDeErro(erro), iniciadoEm });
      } catch (erroRegistro) {
        log(`[resumo] histórico da conta ${curto(c.userId)}: ${mensagemDeErro(erroRegistro)}`);
      }
    }
  }

  if (r.cotaEsgotada) log(`[resumo] cota do Resend esgotada: rodada encerrada, ${r.adiados} contas ficam para a próxima segunda`);
  else if (r.adiados > 0) log(`[resumo] teto de ${r.teto} e-mails do resumo atingido: ${r.adiados} contas ficam para a próxima segunda`);
  return r;
}
