import { NOMES_UF } from '../estados';
import { UFS_BRASIL } from '../eventos';

export { SITE_URL, url } from './site';

/** Assunto das páginas /licitacoes: um por grupo de GRUPOS (lib/relevancia/termos.ts), ligado pelo `grupo`. */
export type Assunto = { slug: string; nome: string; termo: string; grupo: string };

export const ASSUNTOS: readonly Assunto[] = [
  { slug: 'epi', nome: 'EPI', termo: 'EPI', grupo: 'equipamentos de proteção individual' },
  { slug: 'uniformes', nome: 'uniformes', termo: 'uniforme', grupo: 'uniformes profissionais' },
  { slug: 'limpeza', nome: 'materiais de limpeza', termo: 'material de limpeza', grupo: 'materiais de limpeza' },
  { slug: 'construcao', nome: 'materiais de construção', termo: 'material de construção', grupo: 'materiais de construção' },
  { slug: 'moveis', nome: 'móveis', termo: 'mobiliário', grupo: 'móveis' },
  { slug: 'alimentos', nome: 'alimentos e merenda escolar', termo: 'merenda', grupo: 'alimentos e merenda' },
  { slug: 'informatica', nome: 'informática', termo: 'informática', grupo: 'informática' },
  { slug: 'escritorio', nome: 'material de escritório', termo: 'material de escritório', grupo: 'material de escritório' },
  { slug: 'hospitalar', nome: 'medicamentos e material hospitalar', termo: 'medicamento', grupo: 'medicamentos e material hospitalar' },
  { slug: 'veiculos', nome: 'veículos e peças', termo: 'veículo', grupo: 'veículos e peças' },
  { slug: 'combustiveis', nome: 'combustíveis', termo: 'combustível', grupo: 'combustíveis' },
  { slug: 'obras', nome: 'obras e reformas', termo: 'reforma', grupo: 'obras e reformas' },
  { slug: 'manutencao-predial', nome: 'manutenção predial', termo: 'manutenção predial', grupo: 'manutenção predial' },
  { slug: 'servicos-de-saude', nome: 'serviços de saúde', termo: 'serviço de saúde', grupo: 'serviços de saúde' },
  { slug: 'publicidade', nome: 'publicidade e eventos', termo: 'publicidade', grupo: 'publicidade e eventos' },
];

const POR_SLUG = new Map(ASSUNTOS.map((a) => [a.slug, a]));
const UFS = new Set(UFS_BRASIL);

export function assuntoPorSlug(slug: string): Assunto | null {
  return POR_SLUG.get(slug) ?? null;
}

/** 'sp' → 'SP'. Só minúsculas: '/licitacoes/SP' é 404 (um endereço por página). */
export function ufPorSlug(slug: string): string | null {
  if (slug !== slug.toLowerCase()) return null;
  const uf = slug.toUpperCase();
  return UFS.has(uf) ? uf : null;
}

/** Segmento de /licitacoes/[x]: UF tem 2 letras, assunto nunca (teste garante). */
export function resolverSegmento(x: string): { tipo: 'assunto'; assunto: Assunto } | { tipo: 'uf'; uf: string } | null {
  const assunto = assuntoPorSlug(x);
  if (assunto) return { tipo: 'assunto', assunto };
  const uf = ufPorSlug(x);
  return uf ? { tipo: 'uf', uf } : null;
}

const NA = new Set(['BA', 'PB']);
const EM = new Set(['AL', 'GO', 'MG', 'PE', 'RO', 'RR', 'SC', 'SP', 'SE']);

/** "em São Paulo", "na Bahia", "no Rio de Janeiro". */
export function naUf(uf: string): string {
  const prep = NA.has(uf) ? 'na' : EM.has(uf) ? 'em' : 'no';
  return `${prep} ${NOMES_UF[uf]}`;
}
