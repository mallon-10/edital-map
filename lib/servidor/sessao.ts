import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { OPCOES_COOKIE_SESSAO, temCookieDeSessao, type ErroAuth } from '../conta';

declare const MARCA_SESSAO: unique symbol;
/**
 * Usuário da sessão validada no servidor por auth.getUser() (nunca só o cookie). Só este arquivo cria um `Usuario`:
 * o id que lib/servidor/conta.ts usa para filtrar perfil e radar nunca vem do navegador.
 */
export type Usuario = { readonly id: string; readonly email: string; readonly [MARCA_SESSAO]: true };

type Env = { url: string; chave: string };

/** Auth com a chave publicável (SUPABASE_ANON_KEY), só no servidor. A service role continua só para os dados. */
function envAuth(): Env | null {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY;
  return url && chave ? { url, chave } : null;
}

type Jarro = Awaited<ReturnType<typeof cookies>>;

function clienteAuth(env: Env, jarro: Jarro) {
  return createServerClient(env.url, env.chave, {
    cookies: {
      getAll: () => jarro.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) jarro.set(name, value, { ...options, ...OPCOES_COOKIE_SESSAO });
        } catch {
          // Componente de servidor não grava cookie; o proxy (lib/sessaoProxy.ts) renova a sessão antes da página.
        }
      },
    },
  });
}

function paraUsuario(u: { id?: string | null; email?: string | null } | null | undefined): Usuario | null {
  return u?.id && u.email ? ({ id: u.id, email: u.email.toLowerCase() } as Usuario) : null;
}

const erroDe = (e: { code?: string | null; status?: number | null } | null | undefined): ErroAuth => ({
  code: e?.code ?? null,
  status: e?.status ?? null,
});
const SEM_CHAVE: ErroAuth = { code: 'sem_chave', status: null };
/** Exceção (cookies() fora de pedido, rede, supabase-js): mesmo formato de erro, a rota mostra a mensagem genérica. */
const FALHA: ErroAuth = { code: 'falha', status: null };

/**
 * Usuário da sessão, conferido no Supabase Auth. null = sem sessão (ou Auth fora do ar).
 * cache() do React: layout e página do mesmo pedido fazem um getUser só.
 */
export const usuarioAtual = cache(async function usuarioAtual(): Promise<Usuario | null> {
  const env = envAuth();
  if (!env) return null;
  try {
    const jarro = await cookies();
    // Sem cookie sb-* não há sessão: nem cria o cliente nem pergunta ao Auth (visitante anônimo, robô).
    if (!temCookieDeSessao(jarro.getAll().map((c) => c.name))) return null;
    const { data, error } = await clienteAuth(env, jarro).auth.getUser();
    if (error) return null;
    return paraUsuario(data.user);
  } catch (erro) {
    console.error('sessão:', erro);
    return null;
  }
});

/** Manda o código de 6 dígitos por e-mail (modelo "Magic Link"/"Confirm signup" com {{ .Token }}); cria a conta se for nova. */
export async function enviarCodigo(email: string): Promise<{ ok: true } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) {
    console.error('SUPABASE_ANON_KEY ausente: login desligado');
    return { ok: false, erro: SEM_CHAVE };
  }
  try {
    const { error } = await clienteAuth(env, await cookies()).auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? { ok: false, erro: erroDe(error) } : { ok: true };
  } catch (erro) {
    console.error('enviar código:', erro);
    return { ok: false, erro: FALHA };
  }
}

/** Confere o código; certo, o cliente de sessão grava a sessão nos cookies (httpOnly) desta resposta. */
export async function entrarComCodigo(
  email: string,
  codigo: string,
): Promise<{ ok: true; usuario: Usuario } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) return { ok: false, erro: SEM_CHAVE };
  try {
    const { data, error } = await clienteAuth(env, await cookies()).auth.verifyOtp({ email, token: codigo, type: 'email' });
    const usuario = paraUsuario(data?.user);
    if (error || !usuario) return { ok: false, erro: erroDe(error) };
    return { ok: true, usuario };
  } catch (erro) {
    console.error('entrar:', erro);
    return { ok: false, erro: FALHA };
  }
}

/**
 * Entrada pelo link do e-mail (fluxo PKCE do @supabase/ssr): troca o ?code= pela sessão, usando o code_verifier que o
 * pedido do código gravou neste navegador. Outro navegador ou link vencido: falha (a pessoa pede um código novo).
 */
export async function entrarComLink(codigo: string): Promise<{ ok: true } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) return { ok: false, erro: SEM_CHAVE };
  try {
    const { data, error } = await clienteAuth(env, await cookies()).auth.exchangeCodeForSession(codigo);
    if (error || !paraUsuario(data?.user)) return { ok: false, erro: erroDe(error) };
    return { ok: true };
  } catch (erro) {
    console.error('entrar pelo link:', erro);
    return { ok: false, erro: FALHA };
  }
}

/** Apaga à mão os cookies sb-* da sessão (quando o signOut do Auth falha, o visitante sai do mesmo jeito). */
function apagarCookiesDeSessao(jarro: Jarro): void {
  try {
    for (const { name } of jarro.getAll()) if (temCookieDeSessao([name])) jarro.delete(name);
  } catch (erro) {
    console.error('apagar cookies da sessão:', erro);
  }
}

/** Encerra só esta sessão (neste navegador). Se o Auth falhar, os cookies sb-* saem mesmo assim. */
export async function sair(): Promise<{ ok: true } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) return { ok: false, erro: SEM_CHAVE };
  let jarro: Jarro | undefined;
  try {
    jarro = await cookies();
    const { error } = await clienteAuth(env, jarro).auth.signOut({ scope: 'local' });
    if (!error) return { ok: true };
    apagarCookiesDeSessao(jarro);
    return { ok: false, erro: erroDe(error) };
  } catch (erro) {
    console.error('sair:', erro);
    if (jarro) apagarCookiesDeSessao(jarro);
    return { ok: false, erro: FALHA };
  }
}
