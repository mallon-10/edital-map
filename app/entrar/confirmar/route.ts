import { DESTINO_PADRAO, lerCodigoDoLink } from '@/lib/conta';
import { SEM_CACHE } from '@/lib/http';
import { url } from '@/lib/seo/site';
import { entrarComLink } from '@/lib/servidor/sessao';

/**
 * Link do e-mail de entrar: o proxy manda para cá o ?code= que o Supabase devolveu na inicial. Certo, a sessão vai nos
 * cookies httpOnly desta resposta e segue para o Meu Radar; errado, volta a /entrar com o aviso (pedir código novo).
 * Destinos fixos no domínio do site (nada vem do pedido além do código).
 */
export async function GET(request: Request) {
  const codigo = lerCodigoDoLink(new URL(request.url).searchParams.get('code'));
  const r = codigo ? await entrarComLink(codigo) : { ok: false as const };
  if (!r.ok && codigo) console.error('entrar pelo link: falhou');
  const headers = new Headers(SEM_CACHE);
  headers.set('location', url(r.ok ? DESTINO_PADRAO : '/entrar?erro=link'));
  return new Response(null, { status: 303, headers });
}
