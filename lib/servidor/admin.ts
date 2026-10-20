import 'server-only';
import { cookies } from 'next/headers';
import type { PainelAdmin } from '../admin';
import { ehDono } from '../dono';
import { COOKIE_DONO } from '../visitante';
import { supabaseServidor } from './supabase';

/** Só o dono confiável (cookie em_dono assinado com INTERNO_SEGREDO) vê o painel. */
export async function donoNaPagina(): Promise<boolean> {
  return ehDono((await cookies()).get(COOKIE_DONO)?.value, process.env.INTERNO_SEGREDO);
}

/** Números do painel no intervalo [desde, ate) (painel_admin, 0021; sem os eventos internos). Sem cache: o dono quer o agora. */
export async function lerPainel(desde: Date, ate: Date): Promise<PainelAdmin> {
  const { data, error } = await supabaseServidor().rpc('painel_admin', { p_desde: desde.toISOString(), p_ate: ate.toISOString() });
  if (error) throw new Error(`painel_admin: ${error.message}`);
  return data as PainelAdmin;
}
