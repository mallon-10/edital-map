import { REMETENTE_ALERTAS } from '../../lib/alertas/email';
import { limparLog } from './log';

/**
 * Envio pela API HTTP do Resend (sem dependência: fetch do Node 24). Repete só o que pode dar certo depois: 429 de
 * ritmo, 409 da mesma Idempotency-Key ainda em andamento, 5xx, rede ou tempo (15 s), com esperas de 2, 4 e 8 s (4
 * tentativas no total, a regra do PNCP no worker). Cota esgotada (429 daily/monthly_quota_exceeded) não repete: volta
 * com `cotaEsgotada` e quem chamou encerra a rodada (spec §1b). Outro 4xx é falha final. Idempotency-Key: a mesma
 * mensagem repetida em 24 h não sai duas vezes. O erro nunca leva a chave nem e-mail. Sem opção de rastreio: clique e
 * abertura são configuração do domínio no Resend (precisam ficar desligados, senão os links de descadastro são trocados).
 */

export const URL_RESEND = 'https://api.resend.com/emails';
export const ESPERAS_REENVIO_MS = [2000, 4000, 8000] as const;

export type Mensagem = { para: string; assunto: string; html: string; texto: string; cabecalhos: Record<string, string>; idempotencia: string };
export type ResultadoEnvio =
  | { ok: true; id: string; tentativas: number }
  | { ok: false; erro: string; tentativas: number; cotaEsgotada?: true };
export type Enviar = (m: Mensagem) => Promise<ResultadoEnvio>;

type CorpoResend = { id?: unknown; name?: unknown; message?: unknown } | null;

/**
 * 409 só repete quando é a mesma chave ainda em andamento (ou sem nome): `invalid_idempotent_request` (mesma chave, outro
 * conteúdo) nunca dá certo repetindo.
 */
export function repetivel(status: number | null, corpo: CorpoResend = null): boolean {
  if (status === 409) return typeof corpo?.name !== 'string' || corpo.name === 'concurrent_idempotent_requests';
  return status === null || status === 429 || status >= 500;
}

const ERRO_MESMA_CHAVE = 'Resend 409: mesma chave com outro conteúdo: provavelmente já enviado nas últimas 24 h';

const NOMES_COTA = new Set(['daily_quota_exceeded', 'monthly_quota_exceeded']);

/** 429 de cota (diária ou mensal), não de ritmo: tentar de novo hoje não adianta. */
export function cotaEsgotada(status: number | null, corpo: CorpoResend): boolean {
  if (status !== 429 || !corpo) return false;
  if (typeof corpo.name === 'string' && NOMES_COTA.has(corpo.name)) return true;
  return typeof corpo.message === 'string' && /quota/i.test(corpo.message);
}

type Opcoes = { chave: string; remetente?: string; buscar?: typeof fetch; esperar?: (ms: number) => Promise<void>; timeoutMs?: number };

export function criarEnvioResend(o: Opcoes): Enviar {
  const buscar = o.buscar ?? fetch;
  const esperar = o.esperar ?? ((ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms)));
  const limpar = (erro: string) => limparLog(erro, [o.chave]).slice(0, 300);
  return async (m) => {
    const total = ESPERAS_REENVIO_MS.length + 1;
    let erro = '';
    for (let tentativa = 1; tentativa <= total; tentativa++) {
      let status: number | null = null;
      let corpo: CorpoResend = null;
      try {
        const r = await buscar(URL_RESEND, {
          method: 'POST',
          headers: { authorization: `Bearer ${o.chave}`, 'content-type': 'application/json', 'idempotency-key': m.idempotencia },
          body: JSON.stringify({ from: o.remetente ?? REMETENTE_ALERTAS, to: [m.para], subject: m.assunto, html: m.html, text: m.texto, headers: m.cabecalhos }),
          signal: AbortSignal.timeout(o.timeoutMs ?? 15_000),
        });
        status = r.status;
        corpo = (await r.json().catch(() => null)) as CorpoResend;
        if (r.ok && typeof corpo?.id === 'string') return { ok: true, id: corpo.id, tentativas: tentativa };
        erro = `Resend ${r.status}: ${typeof corpo?.message === 'string' ? corpo.message : 'sem detalhe'}`;
        if (cotaEsgotada(status, corpo)) return { ok: false, erro: limpar(erro), tentativas: tentativa, cotaEsgotada: true };
        if (status === 409 && corpo?.name === 'invalid_idempotent_request') erro = ERRO_MESMA_CHAVE;
      } catch (e) {
        erro = `Resend: ${e instanceof Error ? e.message : String(e)}`;
      }
      if (!repetivel(status, corpo) || tentativa === total) return { ok: false, erro: limpar(erro), tentativas: tentativa };
      await esperar(ESPERAS_REENVIO_MS[tentativa - 1]);
    }
    return { ok: false, erro: limpar(erro), tentativas: total };
  };
}
