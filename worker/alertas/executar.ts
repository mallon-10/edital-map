import { createHash } from 'node:crypto';
import { montarEmail } from '../../lib/alertas/email';
import { criarTokenDescadastro } from '../../lib/alertas/token';
import { LIMITES_CONTA } from '../../lib/limitesConta';
import type { AlertaParaEnvio, BancoAlertas, EditalAlerta, RegistroEnvio } from './banco';
import { curto, limparLog } from './log';
import type { Enviar } from './resend';

/**
 * Uma rodada dos alertas (Fase 4, §3): por conta, o plano no momento do envio (Grátis: nenhum; Pro: até 5, pelo mais
 * antigo), os editais novos de cada alerta desde o último envio (primeiro: 24 h), sem repetir (banco), até 20 por
 * alerta; um e-mail por conta; alertas_enviados só depois do aceite do Resend; histórico de tudo em envios_alerta.
 * Uma conta com erro não derruba as outras. Cota do Resend (§1b): no máximo 60 e-mails aceitos por rodada e cota
 * esgotada encerra a rodada; as contas que sobram não são registradas (a janela não avança) e vão primeiro amanhã.
 * Logs públicos (repositório aberto): sem e-mail, sem token, ids com 8 caracteres.
 */

export const LIMITE_EDITAIS_EMAIL = 20;
export const PAUSA_ENTRE_EMAILS_MS = 600;
/** Plano grátis do Resend: 100 por dia, divididos com os códigos de login. */
export const MAX_EMAILS_POR_RODADA = 60;
/** Gravar o enviado depois do aceite: 3 tentativas (registrar_envio_alerta é idempotente nos editais e na janela). */
export const ESPERAS_REGISTRO_MS = [2000, 4000] as const;
const DIA_MS = 24 * 60 * 60 * 1000;
/** Retenção (pg_cron): encerrada há mais de 7 dias sai do banco; a janela nunca precisa ir além disso. */
const RETENCAO_MS = 7 * DIA_MS;

export type DepsEnvio = {
  enviar: Enviar | null;
  segredo: string | null;
  agora: () => Date;
  esperar: (ms: number) => Promise<void>;
  log: (linha: string) => void;
};
export type DepsAlertas = DepsEnvio & { banco: BancoAlertas };
export type ResumoAlertas = {
  contas: number;
  emails: number;
  enviados: number;
  semNovidades: number;
  falhas: number;
  puladosPlano: number;
  editais: number;
  /** Contas que ficaram para amanhã (limite da rodada ou cota esgotada), sem registro. */
  adiados: number;
  cotaEsgotada: boolean;
  /** Seções aceitas pelo Resend cujo registro não gravou (ACEITO_SEM_REGISTRO no log): podem repetir amanhã. */
  aceitosSemRegistro: number;
};

/**
 * Desde quando procurar editais. Com envio: desde ele. Nunca enviado: 24 h antes da criação, ancorado (não no relógio),
 * para um alerta adiado pela cota não perder o dia que ficou para trás; no máximo 7 dias (retenção) + 24 h. Criação
 * ilegível: as últimas 24 h. editais_do_alerta não tem fallback próprio (p_desde é obrigatório e vai sempre daqui).
 */
export function desdeDoAlerta(ultimoEnvioEm: string | null, criadoEm: string, agora: Date): string {
  if (ultimoEnvioEm) return ultimoEnvioEm;
  const criado = Date.parse(criadoEm);
  const base = Number.isNaN(criado) ? agora.getTime() : Math.max(criado, agora.getTime() - RETENCAO_MS);
  return new Date(base - DIA_MS).toISOString();
}

/** Alertas agrupados por conta, cada grupo do mais antigo para o mais novo. */
export function porConta(lista: readonly AlertaParaEnvio[]): AlertaParaEnvio[][] {
  const contas = new Map<string, AlertaParaEnvio[]>();
  for (const a of lista) contas.set(a.userId, [...(contas.get(a.userId) ?? []), a]);
  return [...contas.values()].map((as) => [...as].sort((x, y) => Date.parse(x.criadoEm) - Date.parse(y.criadoEm) || x.id.localeCompare(y.id)));
}

/**
 * Contas pela janela mais antiga primeiro (empate: a ordem de antes). Quem ficou de fora pelo limite da rodada não
 * avançou a janela e passa na frente no dia seguinte, em vez de ficar sempre no fim da fila do user_id.
 */
export function porEspera(contas: readonly AlertaParaEnvio[][], agora: Date): AlertaParaEnvio[][] {
  const espera = (as: readonly AlertaParaEnvio[]) =>
    Math.min(...as.map((a) => Date.parse(desdeDoAlerta(a.ultimoEnvioEm, a.criadoEm, agora))).map((t) => (Number.isNaN(t) ? Infinity : t)));
  return contas
    .map((c, i) => ({ c, i, k: espera(c) }))
    .sort((x, y) => (x.k === y.k ? x.i - y.i : x.k < y.k ? -1 : 1))
    .map((x) => x.c);
}

/** O plano no momento do envio decide quantos alertas da conta saem (os mais antigos). */
export function separarPorPlano(alertas: readonly AlertaParaEnvio[]): { permitidos: AlertaParaEnvio[]; pulados: AlertaParaEnvio[] } {
  const max = LIMITES_CONTA[alertas[0]?.plano ?? 'gratis'].alertas;
  return { permitidos: alertas.slice(0, max), pulados: alertas.slice(max) };
}

/** Mesma chave para o mesmo e-mail (tipo + conta + editais, em qualquer ordem): repetir em 24 h não duplica no Resend. */
export function chaveIdempotencia(tipo: 'alertas' | 'resumo', userId: string, ids: readonly string[]): string {
  return `${tipo}/${userId}/${createHash('sha256').update([...ids].sort().join('|')).digest('hex').slice(0, 32)}`;
}

/** Nada é simulado: sem chave ou sem segredo, o envio falha com o motivo. */
export function motivoSemEnvio(d: DepsEnvio): string | null {
  if (!d.enviar) return 'RESEND_API_KEY ausente';
  if (!d.segredo) return 'ALERTAS_SEGREDO ausente';
  return null;
}

export const mensagemDeErro = (erro: unknown) => (erro instanceof Error ? erro.message : String(erro)).slice(0, 300);

type ComNovidade = { alerta: AlertaParaEnvio; editais: EditalAlerta[]; total: number; desde: string };

/** Anotações do GitHub Actions no fim da rodada (só contagens). Adiar sozinho é aviso, não falha (código de saída 0). */
export function avisosDoResumo(r: ResumoAlertas): string[] {
  const avisos: string[] = [];
  if (r.cotaEsgotada) avisos.push(`::warning::Cota do Resend esgotada: ${r.adiados} contas ficaram para amanhã`);
  else if (r.adiados > 0) avisos.push(`::warning::Teto de ${MAX_EMAILS_POR_RODADA} e-mails atingido: ${r.adiados} contas ficaram para amanhã`);
  if (r.aceitosSemRegistro > 0) {
    avisos.push(`::error::${r.aceitosSemRegistro} alertas enviados sem registro (podem repetir amanhã): procure ACEITO_SEM_REGISTRO no log`);
  }
  return avisos;
}

export async function executarAlertas(d: DepsAlertas): Promise<ResumoAlertas> {
  const r: ResumoAlertas = {
    contas: 0, emails: 0, enviados: 0, semNovidades: 0, falhas: 0, puladosPlano: 0, editais: 0, adiados: 0, cotaEsgotada: false, aceitosSemRegistro: 0,
  };
  const log = (linha: string) => d.log(limparLog(linha));
  const contas = porEspera(porConta(await d.banco.alertasParaEnvio()), d.agora());
  r.contas = contas.length;
  const semEnvio = motivoSemEnvio(d);
  if (semEnvio) log(`[alertas] envio desligado: ${semEnvio}; os alertas com novidade ficam como falhou`);
  let aceitos = 0;

  for (const [i, alertas] of contas.entries()) {
    // Só conta o que o Resend confirmou. Um tempo esgotado ou 5xx que o Resend tenha aceito mesmo assim (as novas
    // tentativas voltam o mesmo id pela Idempotency-Key, mas a que desistiu não) gasta a cota dividida com os códigos de
    // login sem entrar nestes 60: a folga de 40 por dia cobre isso.
    if (r.cotaEsgotada || aceitos >= MAX_EMAILS_POR_RODADA) {
      r.adiados = contas.length - i;
      break;
    }
    const conta = alertas[0];
    const selecionadoEm = d.agora().toISOString();
    // Alertas com novidade ainda sem registro: se a conta quebrar antes do aceite, ficam como falhou.
    let pendentes: ComNovidade[] = [];
    const registrarFalha = async (c: ComNovidade, erro: string, tentativas: number) => {
      pendentes = pendentes.filter((p) => p !== c);
      await d.banco.registrarEnvio({ alertaId: c.alerta.id, status: 'falhou', qtd: c.editais.length, tentativas, erro, selecionadoEm });
      r.falhas++;
    };
    try {
      const { permitidos, pulados } = separarPorPlano(alertas);
      for (const a of pulados) {
        await d.banco.registrarEnvio({ alertaId: a.id, status: 'pulado_plano', qtd: 0, tentativas: 0, selecionadoEm });
        r.puladosPlano++;
      }
      const comNovidade: ComNovidade[] = [];
      for (const a of permitidos) {
        try {
          const desde = desdeDoAlerta(a.ultimoEnvioEm, a.criadoEm, d.agora());
          const achados = await d.banco.editaisDoAlerta(a, desde, LIMITE_EDITAIS_EMAIL);
          if (achados.editais.length > 0) {
            comNovidade.push({ alerta: a, ...achados, desde });
            continue;
          }
          await d.banco.registrarEnvio({ alertaId: a.id, status: 'sem_novidades', qtd: 0, tentativas: 0, selecionadoEm });
          r.semNovidades++;
        } catch (erro) {
          log(`[alertas] alerta ${curto(a.id)}: ${mensagemDeErro(erro)}`);
          await d.banco.registrarEnvio({ alertaId: a.id, status: 'falhou', qtd: 0, tentativas: 0, erro: mensagemDeErro(erro), selecionadoEm });
          r.falhas++;
        }
      }
      if (comNovidade.length === 0) continue;
      pendentes = [...comNovidade];

      if (semEnvio || !d.enviar || !d.segredo) {
        for (const c of comNovidade) await registrarFalha(c, semEnvio ?? 'envio indisponível', 0);
        continue;
      }
      const segredo = d.segredo;
      const email = montarEmail({
        secoes: comNovidade.map((c) => ({ nome: c.alerta.nome, editais: c.editais, total: c.total, tokenSair: criarTokenDescadastro({ tipo: 'alerta', id: c.alerta.id }, segredo) })),
        tokenSairTodos: criarTokenDescadastro({ tipo: 'todos', conta: conta.userId }, segredo),
      });
      const ids = comNovidade.flatMap((c) => c.editais.map((e) => e.id));
      if (r.emails > 0) await d.esperar(PAUSA_ENTRE_EMAILS_MS);
      r.emails++;
      const envio = await d.enviar({ para: conta.email, ...email, idempotencia: chaveIdempotencia('alertas', conta.userId, ids) });

      if (!envio.ok) {
        // Cota esgotada: marca antes de gravar, para a rodada parar mesmo se o registro falhar.
        if (envio.cotaEsgotada) r.cotaEsgotada = true;
        log(`[alertas] conta ${curto(conta.userId)}: ${envio.erro}`);
        for (const c of comNovidade) await registrarFalha(c, envio.erro, envio.tentativas);
        continue;
      }
      // Aceito: o e-mail saiu. Daqui em diante nada vira falhou; cada seção grava por conta própria, com nova tentativa.
      aceitos++;
      pendentes = [];
      for (const c of comNovidade) {
        const avancar = c.total <= c.editais.length;
        const registro: RegistroEnvio = {
          alertaId: c.alerta.id, status: 'enviado', qtd: c.editais.length, tentativas: envio.tentativas, idMensagem: envio.id,
          ids: c.editais.map((e) => e.id), selecionadoEm, avancar,
          ...(!avancar && !c.alerta.ultimoEnvioEm ? { janelaInicial: c.desde } : {}),
        };
        let gravou = false;
        for (let tentativa = 0; !gravou; tentativa++) {
          try {
            await d.banco.registrarEnvio(registro);
            gravou = true;
          } catch (erro) {
            if (tentativa >= ESPERAS_REGISTRO_MS.length) {
              log(`[alertas] registro do alerta ${curto(c.alerta.id)}: ${mensagemDeErro(erro)}`);
              break;
            }
            await d.esperar(ESPERAS_REGISTRO_MS[tentativa]);
          }
        }
        if (gravou) {
          r.enviados++;
          r.editais += c.editais.length;
        } else {
          // Marcador fixo para procurar no log público: o e-mail saiu, mas alertas_enviados não gravou (pode repetir).
          log(`[alertas] ACEITO_SEM_REGISTRO alerta ${curto(c.alerta.id)} msg ${curto(envio.id)} qtd ${c.editais.length}`);
          r.aceitosSemRegistro++;
          r.falhas++;
        }
      }
      try {
        await d.banco.gravarEventoEnvio({ qtd: ids.length, alertas: comNovidade.length });
      } catch (erro) {
        log(`[alertas] evento: ${mensagemDeErro(erro)}`);
      }
    } catch (erro) {
      log(`[alertas] conta ${curto(conta.userId)}: ${mensagemDeErro(erro)}`);
      r.falhas++;
      for (const c of [...pendentes]) {
        try {
          await d.banco.registrarEnvio({ alertaId: c.alerta.id, status: 'falhou', qtd: c.editais.length, tentativas: 0, erro: mensagemDeErro(erro), selecionadoEm });
        } catch (e) {
          log(`[alertas] alerta ${curto(c.alerta.id)}: ${mensagemDeErro(e)}`);
        }
      }
    }
  }

  if (r.cotaEsgotada) log(`[alertas] cota do Resend esgotada: rodada encerrada, ${r.adiados} contas ficam para amanhã`);
  else if (r.adiados > 0) log(`[alertas] limite de ${MAX_EMAILS_POR_RODADA} e-mails na rodada: ${r.adiados} contas ficam para amanhã`);
  return r;
}
