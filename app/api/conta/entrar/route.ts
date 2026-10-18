import { destinoSeguro, lerCodigo, lerEmail, MENSAGENS_CONTA, mensagemErroAuth, statusErroAuth } from '@/lib/conta';
import { SEM_CACHE } from '@/lib/http';
import { entrarComCodigo } from '@/lib/servidor/sessao';

/** Confere o código; certo, a sessão vai nos cookies httpOnly desta resposta e o navegador segue para o destino. */
export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ erro: MENSAGENS_CONTA.codigo }, { status: 400, headers: SEM_CACHE });
  }
  const email = lerEmail(corpo?.email);
  if (!email) return Response.json({ erro: MENSAGENS_CONTA.email }, { status: 400, headers: SEM_CACHE });
  const codigo = lerCodigo(corpo.codigo);
  if (!codigo) return Response.json({ erro: MENSAGENS_CONTA.codigo }, { status: 400, headers: SEM_CACHE });
  try {
    const r = await entrarComCodigo(email, codigo);
    if (!r.ok) {
      if (statusErroAuth(r.erro) === 502) console.error('entrar:', r.erro);
      return Response.json({ erro: mensagemErroAuth(r.erro) }, { status: statusErroAuth(r.erro), headers: SEM_CACHE });
    }
    return Response.json({ destino: destinoSeguro(typeof corpo.destino === 'string' ? corpo.destino : null) }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: MENSAGENS_CONTA.falha }, { status: 502, headers: SEM_CACHE });
  }
}
