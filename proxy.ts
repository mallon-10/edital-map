import { NextResponse, type NextRequest } from 'next/server';
import { ehRobo } from '@/lib/robos';
import { lerCodigoDoLink, rotaComSessao, temCookieDeSessao } from '@/lib/conta';
import { renovarSessao } from '@/lib/sessaoProxy';
import { COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie } from '@/lib/visitante';

/**
 * 1. Garante o cookie em_visitante antes das páginas e rotas que gravam eventos ou leem o plano. A página inicial e a do edital são
 *    componentes de servidor (não gravam cookie), e na primeira visita /api/busca e /api/mapa chegam juntas (sem isto,
 *    cada uma criaria um visitante). O cookie novo vai na resposta e na própria requisição (o cookies() da página já o lê).
 * 2. Com cookie de sessão do Supabase (sb-…-auth-token) e só em /entrar, /radar, /oportunidades, /alertas e nas APIs da
 *    conta, do radar, dos salvos e dos alertas, renova a sessão (lib/sessaoProxy.ts). No resto do site, nada de rede.
 */
export async function proxy(request: NextRequest) {
  // Robô de busca não devolve cookie: cada visita viraria um visitante novo. Sem cookie, nada é gravado.
  if (ehRobo(request.headers.get('user-agent'))) return NextResponse.next();
  // Link do e-mail de entrar (modelo com link em vez do código): o Supabase devolve para a inicial com ?code= (PKCE).
  const codigoDoLink = request.nextUrl.pathname === '/' ? lerCodigoDoLink(request.nextUrl.searchParams.get('code')) : null;
  if (codigoDoLink) {
    const destino = new URL('/entrar/confirmar', request.nextUrl);
    destino.searchParams.set('code', codigoDoLink);
    return NextResponse.redirect(destino);
  }
  const { visitante, novo } = visitanteDoCookie(request.cookies.get(COOKIE_VISITANTE)?.value, () => crypto.randomUUID());
  if (novo) request.cookies.set(COOKIE_VISITANTE, visitante);
  const renova = rotaComSessao(request.nextUrl.pathname) && temCookieDeSessao(request.cookies.getAll().map((c) => c.name));
  if (!novo && !renova) return NextResponse.next();
  const resposta = renova ? await renovarSessao(request) : NextResponse.next({ request: { headers: request.headers } });
  if (novo) resposta.cookies.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  return resposta;
}

export const config = {
  matcher: [
    '/', '/edital/:path*', '/licitacoes/:path*', '/obrigado/:path*', '/assinar', '/assinatura', '/planos', '/alertas', '/alertas/:path*',
    '/sobre', '/entrar', '/radar', '/radar/:path*', '/oportunidades', '/admin', '/api/:path*',
  ],
};
