import { SEM_CACHE } from '@/lib/http';
import { bloqueioSalvar, LIMITES_CONTA, MENSAGENS_LIMITE_CONTA, planoIncerto, type NivelConta } from '@/lib/limitesConta';
import { MENSAGENS_SALVOS, validarMudanca, validarRemocao, validarSalvar, type StatusSalvo } from '@/lib/salvos';
import { planoDaConta } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, gravarEvento, type Contexto } from '@/lib/servidor/registro';
import { estadoDosSalvos, gravarSalvo, mudarObservacao, removerSalvo } from '@/lib/servidor/salvos';
import { usuarioAtual, type Usuario } from '@/lib/servidor/sessao';

/**
 * Salvos da conta da sessão (Minhas Oportunidades). Só JSON do próprio site (CSRF) nas mudanças; o dono vem só de
 * usuarioAtual(); o corpo diz só o edital (contratacoes.id), o status e a observação. Salvar, mudar status ou
 * observação e descartar são do Pro; remover vale para qualquer plano (a pessoa pode limpar o que é dela).
 */

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/** Plano da conta não confirmado (banco fora): pedir para tentar de novo, não o convite ao Pro. */
const planoIndisponivel = () => json({ erro: MENSAGENS_LIMITE_CONTA.planoIndisponivel }, 503);

async function lerCorpo(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Plano de quem pode mudar os salvos: Pro segue (com o teto de salvos); grátis recebe 402 com o convite; plano não
 * confirmado, 503.
 */
async function planoParaMudar(usuario: Usuario, ctx: Contexto): Promise<{ plano: NivelConta; max: number } | Response> {
  const p = await planoDaConta(usuario, ctx);
  if (planoIncerto(p)) return planoIndisponivel();
  const max = LIMITES_CONTA[p.plano].salvos;
  if (max === 0) return json({ erro: bloqueioSalvar(p.plano, 0)?.mensagem ?? MENSAGENS_LIMITE_CONTA.salvosPlano, codigo: 'plano' }, 402);
  return { plano: p.plano, max };
}

/** Mensagem do 402 quando gravar_salvo responde "limite". */
function limite(plano: NivelConta, status: StatusSalvo) {
  if (status === 'descartado') return json({ erro: MENSAGENS_SALVOS.descartadosCheio, codigo: 'limite' }, 402);
  const b = bloqueioSalvar(plano, LIMITES_CONTA[plano].salvos);
  return json({ erro: b?.mensagem ?? MENSAGENS_SALVOS.falha, codigo: b?.codigo ?? 'limite' }, 402);
}

async function registrar(ctx: Contexto, tipo: 'edital_salvo' | 'edital_descartado', plano: NivelConta) {
  try {
    await gravarEvento(ctx, tipo, { plano });
  } catch (erro) {
    console.error(`${tipo}:`, erro);
  }
}

/** Estado para os botões: sem sessão, { conta: false }. */
export async function GET() {
  const usuario = await usuarioAtual();
  if (!usuario) return json({ conta: false });
  try {
    const [p, salvos] = await Promise.all([planoDaConta(usuario, await contexto()), estadoDosSalvos(usuario)]);
    if (planoIncerto(p)) return planoIndisponivel();
    const usados = Object.values(salvos).filter((s) => s.status !== 'descartado').length;
    return json({ conta: true, plano: p.plano, limite: LIMITES_CONTA[p.plano].salvos, usados, salvos });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}

/** Salvar ou descartar (botões). Grátis: 402 com o convite aos planos; no limite: 402. */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' }, 401);
  const v = validarSalvar(await lerCorpo(request));
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    const ctx = await contexto();
    const pode = await planoParaMudar(usuario, ctx);
    if (pode instanceof Response) return pode;
    const r = await gravarSalvo(usuario, v.valor.id, v.valor.status, pode.max);
    if (r === 'sem_edital') return json({ erro: MENSAGENS_SALVOS.semEdital }, 404);
    if (r === 'limite') return limite(pode.plano, v.valor.status);
    await registrar(ctx, v.valor.status === 'descartado' ? 'edital_descartado' : 'edital_salvo', pode.plano);
    return json({ ok: true, status: v.valor.status });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}

/** Minhas Oportunidades: status e/ou observação (Pro). Mudar o status respeita o limite (gravar_salvo). */
export async function PATCH(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' }, 401);
  const v = validarMudanca(await lerCorpo(request));
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    const ctx = await contexto();
    const pode = await planoParaMudar(usuario, ctx);
    if (pode instanceof Response) return pode;
    if (v.valor.status) {
      const r = await gravarSalvo(usuario, v.valor.id, v.valor.status, pode.max);
      if (r === 'sem_edital') return json({ erro: MENSAGENS_SALVOS.naoSalvo }, 404);
      if (r === 'limite') return limite(pode.plano, v.valor.status);
      if (v.valor.status === 'descartado') await registrar(ctx, 'edital_descartado', pode.plano);
    }
    if (v.valor.observacao !== undefined && !(await mudarObservacao(usuario, v.valor.id, v.valor.observacao))) {
      return json({ erro: MENSAGENS_SALVOS.naoSalvo }, 404);
    }
    return json({ ok: true });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}

/** Remover dos salvos (qualquer plano: quem deixou o Pro ainda limpa o que é dele). */
export async function DELETE(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_SALVOS.entrar, codigo: 'entrar' }, 401);
  const v = validarRemocao(await lerCorpo(request));
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    if (!(await removerSalvo(usuario, v.valor.id))) return json({ erro: MENSAGENS_SALVOS.naoSalvo }, 404);
    return json({ ok: true });
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_SALVOS.falha }, 502);
  }
}
