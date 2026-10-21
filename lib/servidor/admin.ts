import 'server-only';
import type { PainelAdmin } from '../admin';
import { supabaseServidor } from './supabase';

/** Números do painel no intervalo [desde, ate) (painel_admin, 0021; sem os eventos internos). Sem cache: o dono quer o agora. */
export async function lerPainel(desde: Date, ate: Date): Promise<PainelAdmin> {
  const { data, error } = await supabaseServidor().rpc('painel_admin', { p_desde: desde.toISOString(), p_ate: ate.toISOString() });
  if (error) throw new Error(`painel_admin: ${error.message}`);
  return data as PainelAdmin;
}
