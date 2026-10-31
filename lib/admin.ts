/** Painel do dono (/admin): período, montagem e nomes. Os números vêm de painel_admin (0021, lib/servidor/admin.ts). */

export const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje', dias: 1 },
  { valor: '7', rotulo: '7 dias', dias: 7 },
  { valor: '30', rotulo: '30 dias', dias: 30 },
  { valor: '90', rotulo: '90 dias', dias: 90 },
] as const;
export type Periodo = (typeof PERIODOS)[number]['valor'];

export type Dia = { dia: string; visitantes: number; paginas: number; buscas: number; editais: number };
type Contagem = { nome: string; n: number };
export type PainelAdmin = {
  resumo: {
    visitantes: number; visitas: number; paginas: number; buscas: number; buscas_sem_resultado: number; editais: number;
    oficial: number; exportou: number; tentou_assinar: number; contas: number; assinaturas: number; alertas: number;
  };
  por_dia: Dia[];
  origens: Contagem[];
  sites: Contagem[];
  campanhas: Contagem[];
  paginas: Array<Contagem & { pessoas: number }>;
  entradas: Contagem[];
  termos: Array<{ termo: string; n: number; pessoas: number; media: number | null; zeros: number }>;
  sem_resultado: Array<{ termo: string; n: number; pessoas: number }>;
  ufs: Contagem[];
  editais_top: Array<{ slug: string; n: number; pessoas: number; objeto: string | null; uf: string | null; municipio_nome: string | null }>;
  recursos: Array<{ tipo: 'usou_recurso' | 'quer_recurso'; nome: string; n: number; pessoas: number }>;
  funil: { visitou: number; buscou: number; abriu_edital: number; viu_planos: number; tentou_assinar: number; assinou: number };
};

const FUSO = 'America/Sao_Paulo';
const DIA_MS = 24 * 60 * 60 * 1000;

/** Data (aaaa-mm-dd) em Brasília. */
function diaEmBrasilia(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Meia-noite de Brasília (UTC-3, sem horário de verão desde 2019) do dia aaaa-mm-dd. */
const meiaNoite = (dia: string) => new Date(`${dia}T00:00:00-03:00`);

/** Período do endereço → intervalo [desde, agora), contando o dia de hoje. Valor estranho = 7 dias. */
export function intervaloDoPeriodo(valor: string | undefined, agora: Date): { periodo: Periodo; desde: Date; ate: Date } {
  const p = PERIODOS.find((x) => x.valor === valor) ?? PERIODOS[1];
  const hoje = meiaNoite(diaEmBrasilia(agora));
  return { periodo: p.valor, desde: new Date(hoje.getTime() - (p.dias - 1) * DIA_MS), ate: agora };
}

/** Todos os dias do intervalo, com zero onde não houve evento. */
export function diasCompletos(dias: Dia[], desde: Date, ate: Date): Dia[] {
  const porDia = new Map(dias.map((d) => [d.dia, d]));
  const fim = diaEmBrasilia(ate);
  const lista: Dia[] = [];
  for (let t = desde.getTime(); ; t += DIA_MS) {
    const dia = diaEmBrasilia(new Date(t));
    lista.push(porDia.get(dia) ?? { dia, visitantes: 0, paginas: 0, buscas: 0, editais: 0 });
    if (dia >= fim) break;
  }
  return lista;
}

/** Largura da barra (%) pelo maior da lista; o que não é zero aparece com pelo menos 2%. */
export function largura(n: number, maior: number): number {
  if (n <= 0 || maior <= 0) return 0;
  return Math.max(2, Math.round((n / maior) * 100));
}

export function taxa(parte: number, base: number): string {
  return base > 0 ? `${Math.round((parte / base) * 100)}%` : '–';
}

const PAGINAS: Record<string, string> = {
  '/': 'Página inicial',
  '/edital': 'Edital',
  '/planos': 'Planos',
  '/licitacoes': 'Licitações (índice)',
  '/cnpj': 'Busca pelo CNPJ',
  '/sobre': 'Sobre',
  '/entrar': 'Entrar',
  '/assinar': 'Checkout',
  '/obrigado': 'Obrigado (assinou)',
  '/radar': 'Meu Radar',
  '/alertas': 'Alertas',
  '/oportunidades': 'Minhas Oportunidades',
};

export function nomeDaPagina(caminho: string): string {
  return PAGINAS[caminho] ?? caminho;
}

const RECURSOS: Record<string, string> = {
  'usou_recurso:relacionados_clique': 'Clicou num edital parecido',
  'usou_recurso:filtro_orgao': 'Filtrou por órgão',
  'usou_recurso:filtro_raio': 'Usou o raio em km',
  'usou_recurso:exportou': 'Exportou CSV',
  'usou_recurso:baixou_documento': 'Baixou documento do edital',
  'usou_recurso:tentou_assinar': 'Tentou assinar',
  'usou_recurso:consultou_cnpj': 'Consultou um CNPJ',
  'usou_recurso:viu_precos': 'Viu os preços (planos)',
  'usou_recurso:escolheu_periodo': 'Trocou mensal/anual (planos)',
  'usou_recurso:clicou_assinar': 'Clicou em Assinar o Pro (planos)',
  'usou_recurso:ativou_chave': 'Ativou a chave do plano (antigo)',
  'usou_recurso:pro_offer_viewed': 'Viu a oferta do Pro (busca, radar, alertas, edital)',
  'usou_recurso:pro_cta_clicked': 'Clicou na oferta do Pro',
  'usou_recurso:assessoria_offer_viewed': 'Viu a oferta da assessoria',
  'usou_recurso:assessoria_qualification_started': 'Começou a triagem da assessoria',
  'usou_recurso:assessoria_qualification_completed': 'Terminou a triagem da assessoria',
  'quer_recurso:plano_pro': 'Quero o Pro (lista de espera)',
  'quer_recurso:plano_basic': 'Quero o Basic (antigo)',
  'quer_recurso:filtros_pro': 'Quis filtros Pro (antigo)',
  'quer_recurso:preco_referencia': 'Quis preço de referência',
  'quer_recurso:quem_venceu': 'Quis saber quem venceu',
  'quer_recurso:resumo_ia': 'Quis resumo por IA',
  'quer_recurso:assessoria': 'Pediu orientação (WhatsApp)',
  'quer_recurso:assessoria_inicio': 'Pediu orientação na inicial (WhatsApp)',
};

export function nomeDoRecurso(tipo: string, recurso: string): string {
  return RECURSOS[`${tipo}:${recurso}`] ?? recurso;
}
