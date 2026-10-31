import { hrefAlertaDaBusca } from './alertaDaBusca';
import { numero } from './formato';
import { localDaBusca } from './inicio';
import { PRECO_PRO_MENSAL } from './planos';
import { chave, separarNegativos, temTermo } from './relevancia/termos';
import type { FiltrosTela } from './tipos';

/**
 * Oferta do Pro depois de uma busca (components/inicio/OfertaBusca.tsx): usa o termo, o lugar e o total reais. Sem termo
 * ou sem resultado não há oferta; a busca grátis nunca é bloqueada.
 */
export type OfertaDaBusca = { chave: string; titulo: string; texto: string; preco: string; href: string };

const MAX_TERMO = 40;

const cortar = (t: string) => (t.length > MAX_TERMO ? `${t.slice(0, MAX_TERMO).trimEnd()}…` : t);

export function ofertaDaBusca(f: FiltrosTela, total: number): OfertaDaBusca | null {
  const termo = separarNegativos(f.q).positivo.replace(/\s+/g, ' ').trim();
  if (!termo || !temTermo(f.q) || total < 1) return null;
  // O alerta guarda o município, não o raio: a promessa de envio fica no que ele faz.
  const lugar = localDaBusca({ ...f, raio: null });
  const abertos = total === 1 ? 'É 1 aberto' : `São ${numero(total)} abertos`;
  return {
    chave: [chave(termo), f.uf, f.cidade?.ibge ?? '', f.raio ?? ''].join('|'),
    titulo: `Não perca os próximos editais de ${cortar(termo)}${lugar ? ` ${lugar}` : ''}.`,
    texto: `${abertos} agora, e novas oportunidades podem aparecer todos os dias. Receba por e-mail, sem precisar pesquisar.`,
    preco: PRECO_PRO_MENSAL,
    href: hrefAlertaDaBusca(f),
  };
}

/** sessionStorage: aparece em toda busca até a pessoa fechar, e fechar vale para a sessão. `vistas` só evita contar o evento duas vezes. */
export const CHAVE_OFERTA_BUSCA = 'em_oferta_busca';
export type SessaoOferta = { fechada: boolean; vistas: string[] };

export function lerSessaoOferta(bruto: string | null): SessaoOferta {
  try {
    const s = JSON.parse(bruto ?? '') as Partial<SessaoOferta> | null;
    return { fechada: s?.fechada === true, vistas: Array.isArray(s?.vistas) ? s.vistas.filter((v) => typeof v === 'string') : [] };
  } catch {
    return { fechada: false, vistas: [] };
  }
}

export function ofertaPodeAparecer(s: SessaoOferta): boolean {
  return !s.fechada;
}

export function marcarOfertaVista(s: SessaoOferta, chaveOferta: string): SessaoOferta {
  return { ...s, vistas: [...s.vistas, chaveOferta] };
}
