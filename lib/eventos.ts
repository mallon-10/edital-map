export const TIPOS_EVENTO = ['busca', 'abriu_edital', 'clicou_edital_oficial', 'quer_recurso', 'usou_recurso'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];
/** Eventos gravados só pelo servidor (o navegador não manda): pedido de alerta e o antigo limite do grátis atingido (não grava mais). */
export const TIPOS_EVENTO_SERVIDOR = ['pediu_alerta', 'limite_atingido', 'assinou'] as const;
export type TipoEventoServidor = (typeof TIPOS_EVENTO_SERVIDOR)[number];
/** Eventos da conta (Evolução, Fase 3), gravados só pelo servidor, sem e-mail no detalhe. */
export const TIPOS_EVENTO_CONTA = ['conta_entrou', 'onboarding_iniciado', 'onboarding_concluido', 'radar_visto'] as const;
export type TipoEventoConta = (typeof TIPOS_EVENTO_CONTA)[number];
/** Minhas Oportunidades, alertas e resumo semanal (Evolução, Fase 4): só servidor e job dos alertas, sem e-mail. */
export const TIPOS_EVENTO_OPORTUNIDADES = ['edital_salvo', 'edital_descartado', 'alerta_criado', 'alerta_enviado', 'resumo_enviado'] as const;
export type TipoEventoOportunidades = (typeof TIPOS_EVENTO_OPORTUNIDADES)[number];

export const RECURSOS = ['preco_referencia', 'quem_venceu', 'resumo_ia', 'plano_pro', 'filtros_pro', 'plano_basic'] as const;
export type Recurso = (typeof RECURSOS)[number];
/** Interesse em planos ("Quero o Basic" / "Quero o Pro" em /planos) e filtros Pro: sem edital. */
const RECURSOS_SEM_EDITAL: readonly string[] = ['plano_pro', 'filtros_pro', 'plano_basic'];

/** Uso dos recursos Pro (evento usou_recurso). */
export const RECURSOS_USADOS = ['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'exportou', 'baixou_documento', 'tentou_assinar', 'consultou_cnpj'] as const;
export type RecursoUsado = (typeof RECURSOS_USADOS)[number];
/** O navegador manda estes; `exportou` e `tentou_assinar` são gravados pelas próprias rotas (que contam o limite por IP). */
const USOS_DO_NAVEGADOR: readonly string[] = ['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'baixou_documento'];

export const REGIOES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['Sul', ['PR', 'RS', 'SC']],
  ['Sudeste', ['ES', 'MG', 'RJ', 'SP']],
  ['Centro-Oeste', ['DF', 'GO', 'MS', 'MT']],
  ['Nordeste', ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']],
  ['Norte', ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO']],
];
export const UFS_BRASIL: readonly string[] = REGIOES.flatMap(([, ufs]) => ufs);

export const LIMITES = { eventosPorHora: 120, exportacoesPorHora: 20, listaEsperaPorHora: 5, assinaturasPorHora: 10, cnpjPorHora: 20 } as const;
export const SLUG_EDITAL = /^[0-9A-Z]{12}\d{2}-\d{4}-\d{1,7}$/;

export type Detalhe = Record<string, string | number | null>;
export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string; silencioso?: boolean };

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function objeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validarEvento(corpo: unknown): Resultado<{ tipo: TipoEvento; detalhe: Detalhe }> {
  if (!objeto(corpo)) return { ok: false, erro: 'corpo inválido' };
  const tipo = corpo.tipo;
  const d = objeto(corpo.detalhe) ? corpo.detalhe : {};
  if (typeof tipo !== 'string' || !(TIPOS_EVENTO as readonly string[]).includes(tipo)) return { ok: false, erro: 'tipo inválido' };
  const edital = typeof d.edital === 'string' && SLUG_EDITAL.test(d.edital) ? d.edital : null;

  if (tipo === 'busca') {
    const q = typeof d.q === 'string' ? d.q.trim().slice(0, 100) : '';
    const uf = typeof d.uf === 'string' && UFS_BRASIL.includes(d.uf) ? d.uf : null;
    return { ok: true, valor: { tipo, detalhe: { q: q || null, uf, dias: d.dias === 7 ? 7 : null } } };
  }
  if (tipo === 'quer_recurso') {
    if (typeof d.recurso !== 'string' || !(RECURSOS as readonly string[]).includes(d.recurso)) return { ok: false, erro: 'recurso inválido' };
    if (RECURSOS_SEM_EDITAL.includes(d.recurso)) return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso } } };
    if (!edital) return { ok: false, erro: 'edital inválido' };
    return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso, edital } } };
  }
  if (tipo === 'usou_recurso') {
    if (typeof d.recurso !== 'string' || !USOS_DO_NAVEGADOR.includes(d.recurso)) return { ok: false, erro: 'recurso inválido' };
    if (d.recurso !== 'relacionados_clique' && d.recurso !== 'baixou_documento') return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso } } };
    if (!edital) return { ok: false, erro: 'edital inválido' };
    if (d.recurso === 'relacionados_clique') return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso, edital } } };
    const documento = typeof d.documento === 'string' && d.documento.trim() ? d.documento.trim().slice(0, 80) : null;
    return { ok: true, valor: { tipo, detalhe: { recurso: d.recurso, edital, documento } } };
  }
  if (!edital) return { ok: false, erro: 'edital inválido' };
  return { ok: true, valor: { tipo: tipo as TipoEvento, detalhe: { edital } } };
}

/** Planos pagos da lista de espera de /planos. */
export const PLANOS_PAGOS = ['basic', 'pro'] as const;
export type PlanoPago = (typeof PLANOS_PAGOS)[number];
export type PeriodoPlano = 'mensal' | 'anual';
export type PedidoListaEspera = { email: string; plano: PlanoPago; periodo: PeriodoPlano };

export function validarListaEspera(corpo: unknown): Resultado<PedidoListaEspera> {
  if (!objeto(corpo)) return { ok: false, erro: 'Formulário inválido.' };
  if (typeof corpo.site === 'string' && corpo.site.trim() !== '') return { ok: false, erro: 'robô', silencioso: true };
  const plano = corpo.plano;
  if (typeof plano !== 'string' || !(PLANOS_PAGOS as readonly string[]).includes(plano)) return { ok: false, erro: 'Escolha o plano.' };
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, erro: 'Confira o e-mail.' };
  const periodo = corpo.periodo ?? 'mensal';
  if (periodo !== 'mensal' && periodo !== 'anual') return { ok: false, erro: 'Formulário inválido.' };
  return { ok: true, valor: { email, plano: plano as PlanoPago, periodo } };
}
