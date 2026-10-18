import { lerEmail, MENSAGENS_CONTA, mensagemErroAuth, statusErroAuth } from '@/lib/conta';
import { SEM_CACHE } from '@/lib/http';
import { enviarCodigo } from '@/lib/servidor/sessao';

/** Pede ao Supabase Auth o código de 6 dígitos (e-mail pelo Resend). Primeiro acesso cria a conta. */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
  }
  const email = lerEmail((corpo as { email?: unknown } | null)?.email);
  if (!email) return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
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
