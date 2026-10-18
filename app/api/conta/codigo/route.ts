import { lerEmail, MENSAGENS_CONTA, mensagemErroAuth, statusErroAuth } from '@/lib/conta';
import { SEM_CACHE } from '@/lib/http';
import { LIMITES_CONTA } from '@/lib/servidor/limiteTentativas';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { hashDoIp } from '@/lib/servidor/registro';
import { enviarCodigo } from '@/lib/servidor/sessao';

/**
 * Pede ao Supabase Auth o código de 6 dígitos (e-mail pelo Resend). Primeiro acesso cria a conta.
 * Trava própria (lib/servidor/limiteTentativas.ts, por instância): 5 pedidos por e-mail e 20 por IP por hora; acima
 * disso, 429 sem chamar o Supabase (que mantém os limites dele como segunda camada).
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
  }
  const email = lerEmail((corpo as { email?: unknown } | null)?.email);
  if (!email) return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
  const ip = hashDoIp(request.headers);
  const { codigosPorEmail, codigosPorIp } = LIMITES_CONTA;
  if (codigosPorEmail.excedido(email) || codigosPorIp.excedido(ip)) {
    return Response.json({ erro: MENSAGENS_CONTA.muitas }, { status: 429, headers: SEM_CACHE });
  }
  codigosPorEmail.registrar(email);
  codigosPorIp.registrar(ip);
  try {
    const r = await enviarCodigo(email);
    if (!r.ok) {
      if (statusErroAuth(r.erro) === 502) console.error('enviar código:', r.erro);
      return Response.json({ erro: mensagemErroAuth(r.erro) }, { status: statusErroAuth(r.erro), headers: SEM_CACHE });
    }
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: MENSAGENS_CONTA.falha }, { status: 502, headers: SEM_CACHE });
  }
}
