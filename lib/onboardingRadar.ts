import type { RespostaCnpj } from './cliente/cnpj';
import type { Radar } from './radar';
import { chave } from './relevancia/termos';
import { ASSUNTOS } from './seo/assuntos';

/**
 * Onboarding do Meu Radar numa tela só (/radar/comecar): um campo para o que a empresa vende ou o CNPJ. Regras puras
 * daqui; quem valida de verdade é validarRadar no POST /api/radar (limites de LIMITES_RADAR).
 */

/** "uniforme, luva; bota" → produtos (sem espaços sobrando, hífen inicial nem repetidos pela chave), depois dos atuais. */
export function produtosDoTexto(texto: string, atuais: readonly string[] = []): string[] {
  const saida = [...atuais];
  const vistos = new Set(atuais.map(chave));
  for (const bruto of texto.split(/[,;]/)) {
    const t = bruto.replace(/^\s*-+/, '').replace(/\s+/g, ' ').trim();
    if (!t || vistos.has(chave(t))) continue;
    vistos.add(chave(t));
    saida.push(t);
  }
  return saida;
}

/** Só números e máscara, com 14 dígitos: a pessoa quis digitar um CNPJ (válido ou não). */
export function pareceCnpj(t: string): boolean {
  return /^[\d.\-/\s]+$/.test(t.trim()) && t.replace(/\D/g, '').length === 14;
}

export type OpcaoSegmento = { slug: string; nome: string; principal: boolean };

/** Segmentos para marcar: os encontrados pela atividade; sem nenhum, todos os assuntos (como o PainelCnpj). */
export function opcoesDoCnpj(r: RespostaCnpj): OpcaoSegmento[] {
  return r.assuntos.length ? r.assuntos : ASSUNTOS.map((a) => ({ slug: a.slug, nome: a.nome, principal: false }));
}

/** Marcados de início: os da atividade principal. */
export function marcadosDoCnpj(r: RespostaCnpj): string[] {
  return r.assuntos.filter((a) => a.principal).map((a) => a.slug);
}

export type LocalCnpj = 'uf' | 'brasil';

/** Padrão: só na UF da sede; empresa sem UF, todo o Brasil. */
export function localPadraoDoCnpj(uf: string | null): LocalCnpj {
  return uf ? 'uf' : 'brasil';
}

/** Termos = o `termo` de cada assunto marcado (na ordem de ASSUNTOS); ufs = [UF da sede] ou []. */
export function radarDoCnpj(marcados: readonly string[], uf: string | null, local: LocalCnpj): { termos: string[]; ufs: string[] } {
  const termos = ASSUNTOS.filter((a) => marcados.includes(a.slug)).map((a) => a.termo);
  return { termos, ufs: local === 'uf' && uf ? [uf] : [] };
}

/** Corpo de POST /api/radar com só produtos e estados; valor, modalidades, ME/EPP e excluídas ficam para o "Ajustar". */
export function corpoRadarRapido(termos: string[], ufs: string[]): Radar {
  return { termos, termosExcluir: [], ufs, municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
}
