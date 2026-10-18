import { SEM_CACHE } from '@/lib/http';
import { sair } from '@/lib/servidor/sessao';

/** Sai da conta (apaga os cookies da sessão). Falha do Auth não impede: os cookies saem do mesmo jeito. */
export async function POST() {
  try {
    await sair();
  } catch (erro) {
    console.error('sair:', erro);
  }
  return new Response(null, { status: 204, headers: SEM_CACHE });
}
