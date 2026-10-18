import { NextResponse, type NextRequest } from 'next/server';
import { ehRobo } from '@/lib/robos';
import { COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie } from '@/lib/visitante';

/**
 * Garante o cookie em_visitante antes das páginas e rotas que contam o uso do dia. A página inicial e a do edital são
 * componentes de servidor (não gravam cookie), e na primeira visita /api/busca e /api/mapa chegam juntas (sem isto,
 * cada uma criaria um visitante). O cookie novo vai na resposta e na própria requisição (o cookies() da página já o lê).
 */
export function proxy(request: NextRequest) {
  // Robô de busca não devolve cookie: cada visita viraria um visitante novo gravando uso_diario. Sem cookie, nada conta.
  if (ehRobo(request.headers.get('user-agent'))) return NextResponse.next();
  const { visitante, novo } = visitanteDoCookie(request.cookies.get(COOKIE_VISITANTE)?.value, () => crypto.randomUUID());
  if (!novo) return NextResponse.next();
  request.cookies.set(COOKIE_VISITANTE, visitante);
  const resposta = NextResponse.next({ request: { headers: request.headers } });
  resposta.cookies.set(COOKIE_VISITANTE, visitante, OPCOES_COOKIE);
  return resposta;
}

export const config = {
  matcher: ['/', '/edital/:path*', '/licitacoes/:path*', '/planos', '/alertas', '/sobre', '/api/:path*'],
};
