import { UFS_BRASIL } from './eventos';
import { cnpjValido } from './pagamento/comprador';
import { ASSUNTOS, type Assunto } from './seo/assuntos';

/**
 * Entrada pelo CNPJ: a atividade da empresa (CNAE, pela BrasilAPI) vira os assuntos da busca. O mapa usa o começo do
 * código de 7 dígitos (divisão, grupo, classe ou subclasse); um CNAE pode dar mais de um assunto.
 */
const MAPA: ReadonlyArray<readonly [string, string]> = [
  // EPI
  ['3292', 'epi'], ['464270', 'epi'], ['4789004', 'epi'],
  // Uniformes e vestuário profissional
  ['1412', 'uniformes'], ['1413', 'uniformes'], ['4642', 'uniformes'], ['4781', 'uniformes'],
  // Limpeza
  ['206', 'limpeza'], ['464940', 'limpeza'], ['4649409', 'limpeza'], ['8121', 'limpeza'], ['8129', 'limpeza'],
  // Materiais de construção
  ['4744', 'construcao'], ['4679', 'construcao'], ['2330', 'construcao'], ['2342', 'construcao'], ['4672', 'construcao'],
  // Móveis
  ['310', 'moveis'], ['4754', 'moveis'], ['4649404', 'moveis'],
  // Alimentos e merenda
  ['10', 'alimentos'], ['463', 'alimentos'], ['4711', 'alimentos'], ['4712', 'alimentos'], ['5620', 'alimentos'],
  // Informática
  ['262', 'informatica'], ['4651', 'informatica'], ['4751', 'informatica'], ['620', 'informatica'], ['631', 'informatica'], ['9511', 'informatica'],
  // Material de escritório
  ['4647', 'escritorio'], ['4761', 'escritorio'], ['1741', 'escritorio'],
  // Medicamentos e material hospitalar
  ['212', 'hospitalar'], ['3250', 'hospitalar'], ['4644', 'hospitalar'], ['4645', 'hospitalar'], ['4771', 'hospitalar'], ['4773', 'hospitalar'],
  // Veículos e peças
  ['29', 'veiculos'], ['451', 'veiculos'], ['452', 'veiculos'], ['453', 'veiculos'], ['454', 'veiculos'],
  // Combustíveis
  ['192', 'combustiveis'], ['4681', 'combustiveis'], ['4731', 'combustiveis'], ['4732', 'combustiveis'],
  // Obras e reformas
  ['41', 'obras'], ['42', 'obras'], ['7111', 'obras'], ['7112', 'obras'],
  // Manutenção predial
  ['4321', 'manutencao-predial'], ['4322', 'manutencao-predial'], ['4329', 'manutencao-predial'], ['4330', 'manutencao-predial'], ['8111', 'manutencao-predial'],
  // Serviços de saúde
  ['86', 'servicos-de-saude'],
  // Publicidade, promoção de vendas, pesquisa de mercado, eventos e gráfica
  ['731', 'publicidade'], ['7320', 'publicidade'], ['8230', 'publicidade'], ['1813', 'publicidade'], ['1812', 'publicidade'],
];

export function normalizarCnpj(t: string): string | null {
  const d = t.replace(/\D/g, '');
  return d.length === 14 && cnpjValido(d) ? d : null;
}

export function assuntosDosCnaes(cnaes: readonly number[]): Assunto[] {
  const achados = new Set<string>();
  for (const c of cnaes) {
    const codigo = String(c).padStart(7, '0');
    for (const [prefixo, slug] of MAPA) if (codigo.startsWith(prefixo)) achados.add(slug);
  }
  return ASSUNTOS.filter((a) => achados.has(a.slug));
}

export type Empresa = {
  razao: string;
  fantasia: string | null;
  uf: string | null;
  municipio: string | null;
  ativa: boolean;
  atividade: string | null;
  cnaes: number[];
};

export function lerBrasilApi(v: unknown): Empresa | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const texto = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
  const razao = texto(o.razao_social);
  if (!razao) return null;
  const principal = Number(o.cnae_fiscal);
  const secundarios = Array.isArray(o.cnaes_secundarios) ? o.cnaes_secundarios.map((s) => Number((s as { codigo?: unknown }).codigo)) : [];
  const uf = texto(o.uf);
  return {
    razao,
    fantasia: texto(o.nome_fantasia),
    uf: uf && UFS_BRASIL.includes(uf) ? uf : null,
    municipio: texto(o.municipio),
    ativa: texto(o.descricao_situacao_cadastral) === 'ATIVA',
    atividade: texto(o.cnae_fiscal_descricao),
    cnaes: [principal, ...secundarios].filter((n) => Number.isInteger(n) && n > 0),
  };
}

/**
 * Assuntos da empresa: os da atividade principal vêm marcados; os das secundárias, desmarcados (empresas grandes têm
 * dezenas de CNAEs secundários e encheriam a busca de ruído).
 */
export function assuntosDaEmpresa(cnaes: readonly number[]): Array<Assunto & { principal: boolean }> {
  const [principal, ...secundarios] = cnaes;
  const daPrincipal = new Set(assuntosDosCnaes(principal ? [principal] : []).map((a) => a.slug));
  const todos = assuntosDosCnaes(cnaes);
  return [...todos.filter((a) => daPrincipal.has(a.slug)), ...todos.filter((a) => !daPrincipal.has(a.slug))].map((a) => ({
    ...a,
    principal: daPrincipal.has(a.slug),
  }));
}

/** Busca da página inicial para a empresa: termos dos assuntos (qualquer um deles) e a UF da sede. */
export function buscaDoCnpj(assuntos: readonly Assunto[], uf: string | null): string {
  const p = new URLSearchParams();
  if (assuntos.length) p.set('q', assuntos.map((a) => a.termo).join(', '));
  if (uf) p.set('uf', uf);
  const t = p.toString();
  return t ? `/?${t}` : '/';
}
