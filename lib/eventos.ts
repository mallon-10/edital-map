export const TIPOS_EVENTO = ['busca', 'abriu_edital', 'clicou_edital_oficial', 'quer_recurso', 'usou_recurso'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];
/** Eventos gravados só pelo servidor (o navegador não manda): pedido de alerta e limite do grátis atingido. */
export const TIPOS_EVENTO_SERVIDOR = ['pediu_alerta', 'limite_atingido'] as const;
export type TipoEventoServidor = (typeof TIPOS_EVENTO_SERVIDOR)[number];

export const RECURSOS = ['preco_referencia', 'quem_venceu', 'resumo_ia', 'plano_pro', 'filtros_pro', 'plano_basic'] as const;
export type Recurso = (typeof RECURSOS)[number];
/** Interesse em planos ("Quero o Basic" / "Quero o Pro" em /planos) e filtros Pro: sem edital. */
const RECURSOS_SEM_EDITAL: readonly string[] = ['plano_pro', 'filtros_pro', 'plano_basic'];

/** Uso dos recursos Pro (evento usou_recurso). */
export const RECURSOS_USADOS = ['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'exportou', 'baixou_documento'] as const;
export type RecursoUsado = (typeof RECURSOS_USADOS)[number];
/** O navegador manda estes; `exportou` é gravado pela própria rota /api/exportar (que conta o limite por IP). */
const USOS_DO_NAVEGADOR: readonly string[] = ['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'baixou_documento'];

export const REGIOES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['Sul', ['PR', 'RS', 'SC']],
  ['Sudeste', ['ES', 'MG', 'RJ', 'SP']],
  ['Centro-Oeste', ['DF', 'GO', 'MS', 'MT']],
  ['Nordeste', ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']],
  ['Norte', ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO']],
];
export const UFS_BRASIL: readonly string[] = REGIOES.flatMap(([, ufs]) => ufs);

/** Estados já marcados no formulário de alerta: só o `?uf=` válido da URL; sem ele, nenhum (o usuário escolhe). */
export function ufsIniciaisAlerta(uf: string | undefined): string[] {
  return uf && UFS_BRASIL.includes(uf) ? [uf] : [];
}

export const LIMITES = { eventosPorHora: 120, alertasPorHora: 5, exportacoesPorHora: 20, listaEsperaPorHora: 5 } as const;
export const SLUG_EDITAL = /^[0-9A-Z]{12}\d{2}-\d{4}-\d{1,7}$/;

export type Detalhe = Record<string, string | number | null>;
export type PedidoAlerta = { email: string; termos: string[]; ufs: string[] };
export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string; silencioso?: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export function validarPedidoAlerta(corpo: unknown): Resultado<PedidoAlerta> {
  if (!objeto(corpo)) return { ok: false, erro: 'Formulário inválido.' };
  if (typeof corpo.site === 'string' && corpo.site.trim() !== '') return { ok: false, erro: 'robô', silencioso: true };

  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, erro: 'Confira o e-mail.' };

  const termos: string[] = [];
  for (const t of Array.isArray(corpo.termos) ? corpo.termos : []) {
    if (typeof t !== 'string') continue;
    const limpo = t.trim().replace(/\s+/g, ' ');
    if (limpo.length < 2 || limpo.length > 60) continue;
    if (!termos.some((x) => x.toLowerCase() === limpo.toLowerCase())) {
      termos.push(limpo);
      if (termos.length > 10) return { ok: false, erro: 'Use até 10 termos.' };
    }
  }
  if (termos.length === 0) return { ok: false, erro: 'Diga pelo menos uma coisa que sua empresa vende.' };

  const ufs = [
    ...new Set((Array.isArray(corpo.ufs) ? corpo.ufs : []).filter((u): u is string => typeof u === 'string' && UFS_BRASIL.includes(u))),
  ];
  if (ufs.length === 0) return { ok: false, erro: 'Escolha pelo menos um estado.' };
  if (corpo.aceite !== true) return { ok: false, erro: 'Confirme o uso do e-mail para o aviso.' };

  return { ok: true, valor: { email, termos, ufs } };
}

/** Planos pagos da lista de espera de /planos. */
export const PLANOS_PAGOS = ['basic', 'pro'] as const;
export type PlanoPago = (typeof PLANOS_PAGOS)[number];
export type PedidoListaEspera = { email: string; plano: PlanoPago };

export function validarListaEspera(corpo: unknown): Resultado<PedidoListaEspera> {
  if (!objeto(corpo)) return { ok: false, erro: 'Formulário inválido.' };
  if (typeof corpo.site === 'string' && corpo.site.trim() !== '') return { ok: false, erro: 'robô', silencioso: true };
  const plano = corpo.plano;
  if (typeof plano !== 'string' || !(PLANOS_PAGOS as readonly string[]).includes(plano)) return { ok: false, erro: 'Escolha o plano.' };
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, erro: 'Confira o e-mail.' };
  return { ok: true, valor: { email, plano: plano as PlanoPago } };
}
