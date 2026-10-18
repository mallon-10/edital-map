import { SEM_CACHE } from '@/lib/http';
import { MENSAGENS_RADAR, validarRadar } from '@/lib/radar';
import { salvarRadar } from '@/lib/servidor/conta';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { contexto, gravarEvento } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

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
      try {
        await gravarEvento(await contexto(), 'onboarding_concluido', {
          termos: v.valor.termos.length,
          ufs: v.valor.ufs.length,
          municipios: v.valor.municipios.length,
        });
      } catch (erro) {
        console.error('onboarding_concluido:', erro);
      }
    }
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível salvar agora. Tente de novo.' }, { status: 502, headers: SEM_CACHE });
  }
}
