import { numero } from './formato';
import type { ResumoItens } from './tipos';

const SEM_SISTEMA = 'Sistema indicado no edital';

/** Domínio do link oficial → nome do sistema onde a disputa acontece (os mais comuns na cobertura atual). */
const SISTEMAS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(^|\.)cnetmobile\.estaleiro\.serpro\.gov\.br$/, 'Compras.gov.br'],
  [/(^|\.)portaldecompraspublicas\.com\.br$/, 'Portal de Compras Públicas'],
  [/(^|\.)bllcompras\.com$/, 'BLL Compras'],
  [/(^|\.)bnccompras\.com$/, 'BNC Compras'],
  [/(^|\.)pregaobanrisul\.com\.br$/, 'Pregão Banrisul'],
  [/(^|\.)licitacoes-e2?\.bb\.com\.br$/, 'Licitações-e (Banco do Brasil)'],
  [/(^|\.)comprasbr\.com\.br$/, 'ComprasBR'],
  [/(^|\.)compras\.rs\.gov\.br$/, 'Compras RS'],
  [/(^|\.)portal\.tce\.rs\.gov\.br$/, 'Portal do TCE-RS'],
  [/(^|\.)licitanet\.com\.br$/, 'Licitanet'],
  [/(^|\.)licitardigital\.com\.br$/, 'Licitar Digital'],
  [/(^|\.)licitamaisbrasil\.com\.br$/, 'Licita Mais Brasil'],
];

export function sistemaDaDisputa(link: string | null): string {
  const texto = link?.trim();
  if (!texto || !/^https?:\/\//i.test(texto)) return SEM_SISTEMA;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return SEM_SISTEMA;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'gov.br' && url.pathname.startsWith('/compras')) return 'Compras.gov.br';
  for (const [padrao, nome] of SISTEMAS) if (padrao.test(host)) return nome;
  return host;
}

const ESFERAS: Record<string, string> = { F: 'Federal', E: 'Estadual', M: 'Municipal', D: 'Distrital' };

export function esferaNome(codigo: string | null): string | null {
  return (codigo && ESFERAS[codigo]) || null;
}

/** "Pregão - Eletrônico" → "Pregão eletrônico". */
export function modalidadeCurta(nome: string | null): string | null {
  return nome ? nome.replace(/\s*-\s*(\p{Lu})/u, (_, letra: string) => ` ${letra.toLocaleLowerCase('pt-BR')}`) : null;
}

export function oQueCompram(r: ResumoItens): string {
  const n = `${numero(r.total)} ${r.total === 1 ? 'item' : 'itens'}`;
  if (r.materiais > 0 && r.servicos > 0) return `${n} · materiais e serviços`;
  if (r.materiais > 0) return `${n} · materiais`;
  if (r.servicos > 0) return `${n} · serviços`;
  return n;
}

export function textoMeEpp(r: ResumoItens): string | null {
  if (r.comBeneficio === 0) return null;
  const partes: string[] = [];
  if (r.exclusivos > 0) {
    if (r.exclusivos === r.total) partes.push(r.total === 1 ? 'Exclusivo para ME/EPP' : `Exclusivo para ME/EPP em todos os ${numero(r.total)} itens`);
    else partes.push(`Exclusivo para ME/EPP em ${numero(r.exclusivos)} de ${numero(r.total)} itens`);
  }
  if (r.cota > 0) partes.push(`Cota reservada em ${numero(r.cota)} ${r.cota === 1 ? 'item' : 'itens'}`);
  return partes.length ? partes.join(' · ') : 'Sem benefício para ME/EPP';
}

export function criterioTexto(criterios: string[]): string | null {
  if (criterios.length === 0) return null;
  if (criterios.length > 1) return 'critérios variados';
  return criterios[0].toLocaleLowerCase('pt-BR');
}
