import { lerRascunhoGuardado } from '../alertaDaBusca';
import type { RascunhoRadar } from '../radar';

const CHAVE = 'em_rascunho_alerta';

/**
 * Filtros da prévia do alerta, guardados neste navegador: quem assina volta ao onboarding com a busca preenchida, sem
 * recomeçar. Só termos e lugar da busca; nada de dado pessoal. Sem armazenamento, o onboarding só abre vazio.
 */
export function guardarRascunhoAlerta(r: RascunhoRadar): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(r));
  } catch {
    // o onboarding abre vazio
  }
}

export function lerRascunhoAlerta(): RascunhoRadar | null {
  try {
    return lerRascunhoGuardado(window.localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function esquecerRascunhoAlerta(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}
