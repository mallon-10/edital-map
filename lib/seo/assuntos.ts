import { NOMES_UF } from '../estados';
import { UFS_BRASIL } from '../eventos';
import { type Modalidade, modalidadePorSlug } from './modalidades';

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
  { slug: 'vigilancia', nome: 'vigilância patrimonial', termo: 'vigilância patrimonial', grupo: 'vigilância e segurança patrimonial' },
  { slug: 'servicos-de-limpeza', nome: 'serviços de limpeza', termo: 'serviço de limpeza', grupo: 'serviços de limpeza' },
  { slug: 'transporte-escolar', nome: 'transporte escolar', termo: 'transporte escolar', grupo: 'transporte escolar' },
  { slug: 'locacao-de-veiculos', nome: 'locação de veículos', termo: 'locação de veículos', grupo: 'locação de veículos' },
  { slug: 'iluminacao-publica', nome: 'iluminação pública', termo: 'iluminação pública', grupo: 'iluminação pública' },
  { slug: 'energia-solar', nome: 'energia solar', termo: 'energia solar', grupo: 'energia solar' },
  { slug: 'ar-condicionado', nome: 'ar-condicionado', termo: 'condicionador', grupo: 'ar-condicionado' },
  { slug: 'cameras-e-monitoramento', nome: 'câmeras e monitoramento', termo: 'câmera de segurança', grupo: 'câmeras e monitoramento' },
  { slug: 'agua-mineral-e-gas', nome: 'água mineral e gás', termo: 'água mineral', grupo: 'água mineral e gás' },
  { slug: 'cestas-basicas', nome: 'cestas básicas', termo: 'cesta básica', grupo: 'cestas básicas' },
  { slug: 'material-didatico', nome: 'material didático e pedagógico', termo: 'material didático', grupo: 'material didático e pedagógico' },
  { slug: 'material-esportivo', nome: 'material esportivo', termo: 'material esportivo', grupo: 'material esportivo' },
  { slug: 'equipamentos-medicos', nome: 'equipamentos médicos e hospitalares', termo: 'equipamento médico', grupo: 'equipamentos médicos e hospitalares' },
  { slug: 'odontologia', nome: 'odontologia', termo: 'odontológico', grupo: 'odontologia' },
  { slug: 'laboratorio', nome: 'laboratório', termo: 'material de laboratório', grupo: 'laboratório' },
  { slug: 'combate-a-incendio', nome: 'combate a incêndio', termo: 'extintor', grupo: 'combate a incêndio' },
  { slug: 'dedetizacao', nome: 'dedetização e controle de pragas', termo: 'dedetização', grupo: 'dedetização e controle de pragas' },
  { slug: 'ferramentas', nome: 'ferramentas', termo: 'ferramenta', grupo: 'ferramentas' },
  { slug: 'jardinagem', nome: 'jardinagem e paisagismo', termo: 'jardinagem', grupo: 'jardinagem e paisagismo' },
  { slug: 'sinalizacao-viaria', nome: 'sinalização viária', termo: 'sinalização viária', grupo: 'sinalização viária' },
  { slug: 'coleta-de-residuos', nome: 'coleta de resíduos', termo: 'coleta de resíduos', grupo: 'coleta de resíduos' },
  { slug: 'telefonia-e-internet', nome: 'telefonia e internet', termo: 'telefonia', grupo: 'telefonia e internet' },
  { slug: 'cursos-e-capacitacao', nome: 'cursos e capacitação', termo: 'capacitação', grupo: 'cursos e capacitação' },
  { slug: 'manutencao-de-veiculos', nome: 'manutenção de veículos', termo: 'manutenção de veículos', grupo: 'manutenção de veículos' },
  { slug: 'eletrodomesticos', nome: 'eletrodomésticos', termo: 'eletrodoméstico', grupo: 'eletrodomésticos' },
  { slug: 'engenharia-e-projetos', nome: 'engenharia e projetos', termo: 'projeto de engenharia', grupo: 'engenharia e projetos' },
  { slug: 'copa-e-cozinha', nome: 'copa e cozinha', termo: 'utensílios de cozinha', grupo: 'copa e cozinha' },
  { slug: 'cama-mesa-e-banho', nome: 'cama, mesa e banho', termo: 'enxoval', grupo: 'cama, mesa e banho' },
  { slug: 'saneamento', nome: 'saneamento', termo: 'saneamento', grupo: 'saneamento' },
  { slug: 'consultoria', nome: 'consultoria e assessoria', termo: 'consultoria', grupo: 'consultoria e assessoria' },
  { slug: 'software-e-sistemas', nome: 'software e sistemas', termo: 'sistema de gestão', grupo: 'software e sistemas' },
  { slug: 'veterinaria', nome: 'veterinária', termo: 'veterinário', grupo: 'veterinária' },
  { slug: 'agricultura', nome: 'agricultura', termo: 'implemento agrícola', grupo: 'agricultura' },
  { slug: 'gases-medicinais', nome: 'gases medicinais', termo: 'oxigênio medicinal', grupo: 'gases medicinais' },
  { slug: 'viagens-e-hospedagem', nome: 'passagens e hospedagem', termo: 'passagem aérea', grupo: 'passagens e hospedagem' },
  { slug: 'locacao-de-equipamentos', nome: 'locação de equipamentos', termo: 'locação de equipamento', grupo: 'locação de equipamentos' },
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

/** Rota estática /licitacoes/orgao/{slug}: nenhum assunto nem modalidade usa este slug (teste garante). */
export const SEGMENTO_ORGAO = 'orgao';

/** Segmento de /licitacoes/[x]: UF tem 2 letras, assunto e modalidade nunca (teste garante). */
export function resolverSegmento(
  x: string,
): { tipo: 'assunto'; assunto: Assunto } | { tipo: 'modalidade'; modalidade: Modalidade } | { tipo: 'uf'; uf: string } | null {
  const assunto = assuntoPorSlug(x);
  if (assunto) return { tipo: 'assunto', assunto };
  const modalidade = modalidadePorSlug(x);
  if (modalidade) return { tipo: 'modalidade', modalidade };
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
