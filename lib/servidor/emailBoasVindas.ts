import 'server-only';
import { createHash } from 'node:crypto';
import { montarBoasVindas, REMETENTE_BOAS_VINDAS } from '../emailBoasVindas';
import type { Periodo } from '../planos';
import { gerarCodigo } from './emailCodigo';

/**
 * Boas-vindas do Pro, pelo webhook da Cakto na assinatura nova: gera o código da conta do e-mail da compra (cria a
 * conta, como o login) e manda pelo Resend o modelo de lib/emailBoasVindas.ts. Sem código, manda mesmo assim (o botão
 * leva a pedir o código). Até 3 tentativas em 5xx, 429 ou rede (1/2 s), com a mesma chave de idempotência por pedido:
 * uma entrega repetida da Cakto não manda dois e-mails. Nunca lança; false = não mandou. Logs sem e-mail, código e chave.
 */

const URL_RESEND = 'https://api.resend.com/emails';
const TEMPO_RESEND_MS = 10_000;
const TENTATIVAS = 3;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function enviarBoasVindas(email: string, periodo: Periodo, pedido: string, esperaMs = 1000): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    console.warn('boas-vindas: RESEND_API_KEY ausente, e-mail não enviado');
    return false;
  }
  try {
    const codigo = await gerarCodigo(email).catch(() => null);
    const e = montarBoasVindas({ email, codigo, periodo });
    const idempotencia = 'boas-vindas-' + createHash('sha256').update(`${pedido}\n${email}`).digest('hex');
    const corpo = JSON.stringify({ from: REMETENTE_BOAS_VINDAS, to: [email], subject: e.assunto, html: e.html, text: e.texto });
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      let status: number | null = null;
      try {
        const r = await fetch(URL_RESEND, {
          method: 'POST',
          headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json', 'idempotency-key': idempotencia },
          body: corpo,
          signal: AbortSignal.timeout(TEMPO_RESEND_MS),
        });
        if (r.ok) return true;
        status = r.status;
        const erro = (await r.json().catch(() => null)) as { name?: unknown } | null;
        // Só o status e o nome do erro: a mensagem do Resend pode repetir o destinatário.
        console.error('boas-vindas: Resend recusou', { status, name: typeof erro?.name === 'string' ? erro.name : null, tentativa });
      } catch (falha) {
        console.error('boas-vindas: falha de rede', { nome: falha instanceof Error ? falha.name : typeof falha, tentativa });
      }
      const repetir = status === null || status === 429 || status >= 500;
      if (!repetir || tentativa === TENTATIVAS) return false;
      await esperar(esperaMs * tentativa);
    }
    return false;
  } catch (erro) {
    console.error('boas-vindas: falha', erro instanceof Error ? erro.name : typeof erro);
    return false;
  }
}
