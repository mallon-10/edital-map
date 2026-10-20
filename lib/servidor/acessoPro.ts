import 'server-only';
import { acessoDoPlano, type AcessoPro } from '../limitesConta';
import { planoDaConta } from './conta';
import { acessoDeDono, planoAtual } from './plano';
import type { Contexto } from './registro';
import type { Usuario } from './sessao';

/**
 * Acesso às áreas do Pro (Meu Radar, Minhas Oportunidades, Alertas): o dono confiável sempre entra; com conta, vale o
 * plano da conta (perfis.plano, assinatura pelo e-mail ou do navegador; consulta falhou = incerto); sem conta, o plano
 * do navegador (quem comprou sem entrar é mandado para /entrar pela própria página).
 */
export async function acessoAoPro(usuario: Usuario | null, ctx: Contexto | null): Promise<AcessoPro> {
  if (ctx && acessoDeDono(ctx)) return 'liberado';
  if (!usuario) return (await planoAtual(ctx)) === 'pro' ? 'liberado' : 'bloqueado';
  return acessoDoPlano(await planoDaConta(usuario, ctx));
}
