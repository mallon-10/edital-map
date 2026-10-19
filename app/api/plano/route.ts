import { SEM_CACHE } from '@/lib/http';
import { planoDaPagina } from '@/lib/servidor/plano';
import { contexto } from '@/lib/servidor/registro';

/** Plano deste navegador para o cabeçalho das páginas que não o calculam no servidor (faixa da oferta, "Minha assinatura"). */
export async function GET() {
  return Response.json(await planoDaPagina(await contexto()), { headers: SEM_CACHE });
}
