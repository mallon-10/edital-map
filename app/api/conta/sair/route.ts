import { SEM_CACHE } from '@/lib/http';
import { recusaForaDoSite } from '@/lib/servidor/mesmaOrigem';
import { sair } from '@/lib/servidor/sessao';

/**
 * Sai da conta (apaga os cookies da sessão). Falha do Auth não impede: sair() apaga os cookies sb-* à mão.
 * Só JSON do próprio site: outro site não consegue deslogar o visitante (CSRF).
 */
export async function POST(request: Request) {
  const recusa = recusaForaDoSite(request);
  if (recusa) return recusa;
  try {
    await sair();
  } catch (erro) {
    console.error('sair:', erro);
  }
  return new Response(null, { status: 204, headers: SEM_CACHE });
}
