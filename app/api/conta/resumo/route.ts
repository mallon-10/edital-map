import { SEM_CACHE } from '@/lib/http';
import { mudarResumoSemanal } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { usuarioAtual } from '@/lib/servidor/sessao';

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/** Liga ou desliga o resumo semanal do Pro na conta da sessão (página /alertas). Só JSON do próprio site. */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: 'Entre para mudar o resumo semanal.', codigo: 'entrar' }, 401);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }
  const ligado = (corpo as { ligado?: unknown } | null)?.ligado;
  if (typeof ligado !== 'boolean') return json({ erro: 'Pedido inválido.' }, 400);
  try {
    await mudarResumoSemanal(usuario, ligado);
    return json({ ok: true, ligado });
  } catch (erro) {
    console.error(erro);
    return json({ erro: 'Não foi possível salvar agora. Tente de novo.' }, 502);
  }
}
