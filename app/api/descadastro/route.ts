import { lerSegredo, lerTokenDescadastro } from '@/lib/alertas/token';
import { SEM_CACHE } from '@/lib/http';
import { url } from '@/lib/seo/site';
import { aplicarDescadastro } from '@/lib/servidor/descadastro';

/**
 * Descadastro de um clique (List-Unsubscribe-Post, RFC 8058) e botão de /alertas/sair (o GET, abaixo, só redireciona).
 * Exceção documentada às rotas da conta: sem sessão e sem checagem de origem nem de content-type (Gmail e Outlook mandam o POST de fora do site, com
 * `List-Unsubscribe=One-Click` em form ou sem corpo; o corpo não é lido). A autorização é só o token assinado com
 * ALERTAS_SEGREDO, que pausa (não apaga). Token ruim: 400 sem tocar no banco. O log não leva token nem id.
 */
export async function POST(request: Request) {
  const segredo = lerSegredo(process.env.ALERTAS_SEGREDO);
  if (!segredo) console.error('ALERTAS_SEGREDO ausente ou curto');
  const alvo = lerTokenDescadastro(new URL(request.url).searchParams.get('t'), segredo);
  if (!alvo) return Response.json({ erro: 'Link inválido.' }, { status: 400, headers: SEM_CACHE });
  try {
    const pausados = await aplicarDescadastro(alvo);
    return Response.json({ ok: true, pausados }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error('descadastro falhou:', erro instanceof Error ? erro.message : 'erro desconhecido');
    return Response.json({ erro: 'Não foi possível concluir agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}

/**
 * Cliente de e-mail sem RFC 8058 abre o link do List-Unsubscribe com GET (e leitores de e-mail abrem links sozinhos):
 * nada é aplicado, só 303 para a confirmação em /alertas/sair com o mesmo token. Destino sempre no SITE_URL (o host
 * do pedido não conta).
 */
export function GET(request: Request) {
  const t = new URL(request.url).searchParams.get('t') ?? '';
  const cabecalhos = new Headers(SEM_CACHE);
  cabecalhos.set('Location', url(`/alertas/sair?t=${encodeURIComponent(t)}`));
  return new Response(null, { status: 303, headers: cabecalhos });
}
