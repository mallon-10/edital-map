import 'server-only';
import { createHash } from 'node:crypto';
import { ASSUNTO_CODIGO, codigoValido, htmlDoCodigo, REMETENTE_CODIGO, textoDoCodigo } from '../emailCodigo';
import { supabaseServidor } from './supabase';

/**
 * O site manda o e-mail do código: o Auth gera o código sem mandar e-mail (auth.admin.generateLink 'magiclink', service
 * role; conta nova vira 'signup' e é criada no Auth) e o Resend entrega o modelo da marca (lib/emailCodigo.ts). O código
 * de 6 dígitos (properties.email_otp) é o mesmo que verifyOtp({ type: 'email' }) confere (confirmation_token ou
 * recovery_token). false = não deu (sem RESEND_API_KEY, Auth ou Resend fora): quem chamou volta ao e-mail do Supabase.
 *
 * generateLink pela service role não passa pelo limite de e-mails do Supabase: a rota /api/conta/codigo conta as
 * tentativas (codigosPorEmail/codigosPorIp) antes de chegar aqui. Os logs nunca levam o e-mail, o código nem a chave.
 */

const URL_RESEND = 'https://api.resend.com/emails';
const TEMPO_RESEND_MS = 10_000;

type ErroAuth = { code?: string | null; status?: number | null } | null | undefined;
const resumoErro = (e: ErroAuth) => ({ code: e?.code ?? null, status: e?.status ?? null });
const nomeDaExcecao = (e: unknown) => (e instanceof Error ? e.name : typeof e);

let avisouSemChave = false;

/** Código de 6 dígitos da conta deste e-mail (cria a conta se não existir). null = não deu. Também usado nas boas-vindas do Pro. */
export async function gerarCodigo(email: string): Promise<string | null> {
  const admin = supabaseServidor().auth.admin;
  let r = await admin.generateLink({ type: 'magiclink', email });
  if (r.error?.code === 'user_not_found') {
    // O Auth cria a conta no próprio generateLink; se não criou, cria confirmada e gera de novo.
    const criado = await admin.createUser({ email, email_confirm: true });
    if (criado.error && criado.error.code !== 'email_exists') {
      console.error('código pelo site: createUser falhou', resumoErro(criado.error));
      return null;
    }
    r = await admin.generateLink({ type: 'magiclink', email });
  }
  if (r.error) {
    console.error('código pelo site: generateLink falhou', resumoErro(r.error));
    return null;
  }
  const codigo = r.data?.properties?.email_otp;
  if (!codigoValido(codigo)) {
    console.error('código pelo site: código do Auth fora do formato de 6 dígitos');
    return null;
  }
  return codigo;
}

/** Uma tentativa só (o visitante está esperando): falhou, o Supabase manda. A chave de idempotência não repete o mesmo código. */
async function mandarPeloResend(chave: string, email: string, codigo: string): Promise<boolean> {
  const idempotencia = 'codigo-' + createHash('sha256').update(`${email}\n${codigo}`).digest('hex');
  const r = await fetch(URL_RESEND, {
    method: 'POST',
    headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json', 'idempotency-key': idempotencia },
    body: JSON.stringify({
      from: REMETENTE_CODIGO,
      to: [email],
      subject: ASSUNTO_CODIGO,
      html: htmlDoCodigo(codigo),
      text: textoDoCodigo(codigo),
    }),
    signal: AbortSignal.timeout(TEMPO_RESEND_MS),
  });
  if (r.ok) return true;
  const corpo = (await r.json().catch(() => null)) as { name?: unknown } | null;
  // Só o status e o nome do erro: a mensagem do Resend pode repetir o destinatário.
  console.error('código pelo site: Resend recusou', { status: r.status, name: typeof corpo?.name === 'string' ? corpo.name : null });
  return false;
}

export async function enviarCodigoPeloSite(email: string): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    if (!avisouSemChave) console.warn('código pelo site: RESEND_API_KEY ausente, e-mail do código pelo Supabase');
    avisouSemChave = true;
    return false;
  }
  try {
    const codigo = await gerarCodigo(email);
    return codigo !== null && (await mandarPeloResend(chave, email, codigo));
  } catch (erro) {
    console.error('código pelo site: falha', nomeDaExcecao(erro));
    return false;
  }
}
