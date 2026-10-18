import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OPCOES_COOKIE_SESSAO, type ErroAuth } from '../conta';

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

async function clienteAuth(env: Env) {
  const jarro = await cookies();
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

/** Usuário da sessão, conferido no Supabase Auth a cada chamada. null = sem sessão (ou Auth fora do ar). */
export async function usuarioAtual(): Promise<Usuario | null> {
  const env = envAuth();
  if (!env) return null;
  try {
    const { data, error } = await (await clienteAuth(env)).auth.getUser();
    if (error) return null;
    return paraUsuario(data.user);
  } catch (erro) {
    console.error('sessão:', erro);
    return null;
  }
}

/** Manda o código de 6 dígitos por e-mail (modelo "Magic Link"/"Confirm signup" com {{ .Token }}); cria a conta se for nova. */
export async function enviarCodigo(email: string): Promise<{ ok: true } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) {
    console.error('SUPABASE_ANON_KEY ausente: login desligado');
    return { ok: false, erro: SEM_CHAVE };
  }
  const { error } = await (await clienteAuth(env)).auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  return error ? { ok: false, erro: erroDe(error) } : { ok: true };
}

/** Confere o código; certo, o cliente de sessão grava a sessão nos cookies (httpOnly) desta resposta. */
export async function entrarComCodigo(
  email: string,
  codigo: string,
): Promise<{ ok: true; usuario: Usuario } | { ok: false; erro: ErroAuth }> {
  const env = envAuth();
  if (!env) return { ok: false, erro: SEM_CHAVE };
  const { data, error } = await (await clienteAuth(env)).auth.verifyOtp({ email, token: codigo, type: 'email' });
  const usuario = paraUsuario(data?.user);
  if (error || !usuario) return { ok: false, erro: erroDe(error) };
  return { ok: true, usuario };
}

/** Encerra só esta sessão (neste navegador). */
export async function sair(): Promise<void> {
  const env = envAuth();
  if (!env) return;
  await (await clienteAuth(env)).auth.signOut({ scope: 'local' });
}
