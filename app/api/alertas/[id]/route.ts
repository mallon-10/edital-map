import { lerIdAlerta, MENSAGENS_ALERTA, validarMudancaAlerta } from '@/lib/alertas/regras';
import { SEM_CACHE } from '@/lib/http';
import { atualizarAlerta, excluirAlerta, mudarAtivoAlerta } from '@/lib/servidor/alertas';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { usuarioAtual } from '@/lib/servidor/sessao';

type Contexto = { params: Promise<{ id: string }> };
const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/**
 * Pausar/retomar ({ ativo }) ou editar (o alerta inteiro) um alerta da conta da sessão. Editar não muda o limite.
 * Toda mudança filtra pelo id da sessão: um id de outra conta responde 404 (igual a um id que não existe).
 */
export async function PATCH(request: Request, { params }: Contexto) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' }, 401);
  const id = lerIdAlerta((await params).id);
  if (!id) return json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: MENSAGENS_ALERTA.formulario }, 400);
  }
  const v = validarMudancaAlerta(corpo);
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    const ok = v.valor.tipo === 'ativo' ? await mudarAtivoAlerta(usuario, id, v.valor.ativo) : await atualizarAlerta(usuario, id, v.valor.alerta);
    return ok ? json({ ok: true }) : json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_ALERTA.falha }, 502);
  }
}

/** Excluir um alerta da conta da sessão (os envios dele saem junto, on delete cascade). */
export async function DELETE(request: Request, { params }: Contexto) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' }, 401);
  const id = lerIdAlerta((await params).id);
  if (!id) return json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  try {
    return (await excluirAlerta(usuario, id)) ? json({ ok: true }) : json({ erro: MENSAGENS_ALERTA.naoEncontrado }, 404);
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_ALERTA.falha }, 502);
  }
}
