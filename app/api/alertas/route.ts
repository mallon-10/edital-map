import { MENSAGENS_ALERTA, TetoDeAlertas, validarAlerta } from '@/lib/alertas/regras';
import { SEM_CACHE } from '@/lib/http';
import { bloqueioAlerta, LIMITES_CONTA, MENSAGENS_LIMITE_CONTA, planoIncerto } from '@/lib/limitesConta';
import { contarAlertas, criarAlerta } from '@/lib/servidor/alertas';
import { planoDaConta } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, gravarEvento } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });

/**
 * Cria um alerta na conta da sessão (Fase 4, §3). Só JSON do próprio site (CSRF); o dono vem só de usuarioAtual().
 * Plano da conta (manual, assinatura com o e-mail da conta ou navegador): Grátis nenhum, Pro até 5 (pausados contam).
 * Plano não confirmado (banco fora na conta): 503 para tentar de novo, não o convite ao Pro. A conferência do limite
 * aqui dá a mensagem amigável; quem garante o teto com pedidos simultâneos é o gatilho da 0018 (TetoDeAlertas → 402).
 * O antigo pedido de alerta por e-mail (pedidos_alerta) saiu; os pedidos antigos continuam guardados no banco.
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return json({ erro: MENSAGENS_ALERTA.entrar, codigo: 'entrar' }, 401);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: MENSAGENS_ALERTA.formulario }, 400);
  }
  const v = validarAlerta(corpo);
  if (!v.ok) return json({ erro: v.erro }, 400);
  try {
    const ctx = await contexto();
    const [p, qtd] = await Promise.all([planoDaConta(usuario, ctx), contarAlertas(usuario)]);
    if (planoIncerto(p)) return json({ erro: MENSAGENS_LIMITE_CONTA.planoIndisponivel }, 503);
    const bloqueio = bloqueioAlerta(p.plano, qtd);
    if (bloqueio) return json({ erro: bloqueio.mensagem, codigo: bloqueio.codigo }, 402);
    let id: string;
    try {
      id = await criarAlerta(usuario, v.valor);
    } catch (erro) {
      if (!(erro instanceof TetoDeAlertas)) throw erro;
      // Dois pedidos ao mesmo tempo passaram pela conferência acima; o gatilho da 0018 segurou o que passava do teto.
      const teto = bloqueioAlerta(p.plano, LIMITES_CONTA[p.plano].alertas) ?? bloqueioAlerta('pro', LIMITES_CONTA.pro.alertas)!;
      return json({ erro: teto.mensagem, codigo: teto.codigo }, 402);
    }
    const origem = (corpo as { origem?: unknown }).origem === 'radar' ? 'radar' : 'manual';
    try {
      await gravarEvento(ctx, 'alerta_criado', {
        termos: v.valor.termos.length, ufs: v.valor.ufs.length, municipios: v.valor.municipios.length, origem, plano: p.plano,
      });
    } catch (erro) {
      console.error('alerta_criado:', erro);
    }
    return json({ ok: true, id }, 201);
  } catch (erro) {
    console.error(erro);
    return json({ erro: MENSAGENS_ALERTA.falha }, 502);
  }
}
