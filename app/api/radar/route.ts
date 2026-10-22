import { alertaDoRadar } from '@/lib/alertas/regras';
import { SEM_CACHE } from '@/lib/http';
import { planoIncerto } from '@/lib/limitesConta';
import { MENSAGENS_RADAR, validarRadar, type Radar } from '@/lib/radar';
import { contarAlertas, criarAlerta } from '@/lib/servidor/alertas';
import { planoDaConta, salvarRadar } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, gravarEvento, type Contexto } from '@/lib/servidor/registro';
import { usuarioAtual, type Usuario } from '@/lib/servidor/sessao';

/**
 * Alerta diário do onboarding: a conta Pro que acaba de criar o radar e ainda não tem alerta ganha um com os mesmos
 * filtros (o /obrigado promete os alertas das 7h). Grátis, plano incerto ou conta com alerta: nada. Falhou: o radar
 * fica salvo e a pessoa cria o alerta em /alertas. true = criou.
 */
async function alertaDoOnboarding(usuario: Usuario, radar: Radar, ctx: Contexto): Promise<boolean> {
  try {
    const [p, qtd] = await Promise.all([planoDaConta(usuario, ctx), contarAlertas(usuario)]);
    if (planoIncerto(p) || p.plano !== 'pro' || qtd > 0) return false;
    await criarAlerta(usuario, alertaDoRadar(radar));
    try {
      await gravarEvento(ctx, 'alerta_criado', {
        termos: radar.termos.length, ufs: radar.ufs.length, municipios: radar.municipios.length, origem: 'onboarding', plano: p.plano,
      });
    } catch (erro) {
      console.error('alerta_criado:', erro);
    }
    return true;
  } catch (erro) {
    console.error('alerta do onboarding:', erro instanceof Error ? erro.message : erro);
    return false;
  }
}

/**
 * Cria ou troca o radar da conta da sessão. Só JSON do próprio site (CSRF). O dono vem só de auth.getUser()
 * (usuarioAtual); o corpo nunca diz de quem é (validarRadar deixa passar só os campos do radar).
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: 'Entre para salvar seu radar.' }, { status: 401, headers: SEM_CACHE });
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: MENSAGENS_RADAR.formulario }, { status: 400, headers: SEM_CACHE });
  }
  const v = validarRadar(corpo);
  if (!v.ok) return Response.json({ erro: v.erro }, { status: 400, headers: SEM_CACHE });
  try {
    const resultado = await salvarRadar(usuario, v.valor);
    if (resultado === 'criado') {
      const ctx = await contexto();
      try {
        await gravarEvento(ctx, 'onboarding_concluido', {
          termos: v.valor.termos.length,
          ufs: v.valor.ufs.length,
          municipios: v.valor.municipios.length,
        });
      } catch (erro) {
        console.error('onboarding_concluido:', erro);
      }
      if (await alertaDoOnboarding(usuario, v.valor, ctx)) return Response.json({ ok: true, alerta: true }, { headers: SEM_CACHE });
    }
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível salvar agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
