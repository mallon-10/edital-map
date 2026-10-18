import { destinoSeguro, lerCodigo, lerEmail, MENSAGENS_CONTA, mensagemErroAuth, statusErroAuth } from '@/lib/conta';
import { SEM_CACHE } from '@/lib/http';
import { lerRadar } from '@/lib/servidor/conta';
import { LIMITES_CONTA } from '@/lib/servidor/limiteTentativas';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, gravarEvento, hashDoIp } from '@/lib/servidor/registro';
import { entrarComCodigo } from '@/lib/servidor/sessao';

/**
 * Confere o código; certo, a sessão vai nos cookies httpOnly desta resposta e o navegador segue para o destino.
 * Trava própria contra força bruta (lib/servidor/limiteTentativas.ts, por instância): 5 códigos errados por e-mail e
 * 20 por IP em 15 min; acima disso, 429 sem chamar o Supabase. Login certo zera as falhas do e-mail.
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
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
  const ip = hashDoIp(request.headers);
  const { falhasPorEmail, falhasPorIp } = LIMITES_CONTA;
  if (falhasPorEmail.excedido(email) || falhasPorIp.excedido(ip)) {
    return Response.json({ erro: MENSAGENS_CONTA.muitas }, { status: 429, headers: SEM_CACHE });
  }
  try {
    const r = await entrarComCodigo(email, codigo);
    if (!r.ok) {
      const status = statusErroAuth(r.erro);
      if (status === 502) console.error('entrar:', r.erro);
      else {
        // Código errado/expirado (ou limite do Supabase): conta como falha. Pane do Supabase (502) não conta.
        falhasPorEmail.registrar(email);
        falhasPorIp.registrar(ip);
      }
      return Response.json({ erro: mensagemErroAuth(r.erro) }, { status, headers: SEM_CACHE });
    }
    falhasPorEmail.zerar(email);
    // Medição: login (sem e-mail). Falha só vai para o log.
    try {
      const temRadar = (await lerRadar(r.usuario)) !== null;
      await gravarEvento(await contexto(), 'conta_entrou', { radar: temRadar ? 'sim' : 'nao' });
    } catch (erro) {
      console.error('conta_entrou:', erro);
    }
    return Response.json({ destino: destinoSeguro(typeof corpo.destino === 'string' ? corpo.destino : null) }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: MENSAGENS_CONTA.falha }, { status: 502, headers: SEM_CACHE });
  }
}
