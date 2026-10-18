import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { OPCOES_COOKIE_SESSAO } from './conta';

/**
 * Renova a sessão do Supabase Auth antes da página ou rota (padrão do @supabase/ssr): auth.getUser() troca o token
 * vencido e os cookies novos vão na requisição (a página já lê) e na resposta (o navegador guarda), sempre httpOnly.
 * Sem SUPABASE_ANON_KEY ou com o Auth fora do ar, segue sem renovar.
 */
export async function renovarSessao(request: NextRequest): Promise<NextResponse> {
  let resposta = NextResponse.next({ request: { headers: request.headers } });
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY;
  if (!url || !chave) return resposta;
  const sb = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, cabecalhos?: Record<string, string>) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request: { headers: request.headers } });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, { ...options, ...OPCOES_COOKIE_SESSAO });
        for (const [nome, valor] of Object.entries(cabecalhos ?? {})) resposta.headers.set(nome, valor);
      },
    },
  });
  try {
    await sb.auth.getUser();
  } catch (erro) {
    console.error('renovar sessão:', erro);
  }
  return resposta;
}
