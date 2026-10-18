import { lerSegredo, lerTokenDescadastro } from '@/lib/alertas/token';
import { SEM_CACHE } from '@/lib/http';
import { aplicarDescadastro } from '@/lib/servidor/descadastro';

/**
 * Descadastro de um clique (List-Unsubscribe-Post, RFC 8058) e botão de /alertas/sair. Exceção documentada às rotas
 * da conta: sem sessão e sem checagem de origem nem de content-type (Gmail e Outlook mandam o POST de fora do site, com
 * `List-Unsubscribe=One-Click` em form ou sem corpo; o corpo não é lido). A autorização é só o token assinado com
 * ALERTAS_SEGREDO, que pausa (não apaga). Token ruim: 400 sem tocar no banco. O log não leva token nem id.
 */
export async function POST(request: Request) {
  const alvo = lerTokenDescadastro(new URL(request.url).searchParams.get('t'), lerSegredo(process.env.ALERTAS_SEGREDO));
  if (!alvo) return Response.json({ erro: 'Link inválido.' }, { status: 400, headers: SEM_CACHE });
  try {
    const pausados = await aplicarDescadastro(alvo);
    return Response.json({ ok: true, pausados }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error('descadastro falhou:', erro instanceof Error ? erro.message : 'erro desconhecido');
    return Response.json({ erro: 'Não foi possível concluir agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
