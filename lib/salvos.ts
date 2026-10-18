import type { Resultado } from './eventos';
import { rotuloSituacao } from './situacao';

/**
 * Minhas Oportunidades (Evolução, Fase 4, §2): status pessoais, observação, validação das rotas, linhas do banco, abas
 * e ordem. Os status são da pessoa e não mudam a situação oficial do edital. Puro: sem rede e sem dono (o dono vem da
 * sessão em lib/servidor/salvos.ts).
 */

export const STATUS_SALVO = ['salvo', 'analise', 'participar', 'descartado'] as const;
export type StatusSalvo = (typeof STATUS_SALVO)[number];
export const ROTULO_STATUS: Record<StatusSalvo, string> = {
  salvo: 'Salvo',
  analise: 'Em análise',
  participar: 'Vou participar',
  descartado: 'Descartado',
};
export const MAX_OBSERVACAO = 500;
/**
 * numeroControlePNCP (contratacoes.id): CNPJ-esfera-sequencial/ano, ex.: 00394452000103-1-021982/2026. O CNPJ pode ser
 * alfanumérico (os 12 primeiros podem ser letras maiúsculas; os 2 verificadores são números), como em SLUG_EDITAL.
 */
export const ID_CONTRATACAO = /^[0-9A-Z]{12}\d{2}-\d{1,2}-\d{1,7}\/\d{4}$/;

export const MENSAGENS_SALVOS = {
  formulario: 'Pedido inválido.',
  status: 'Status inválido.',
  observacao: 'Use até 500 caracteres na observação.',
  entrar: 'Entre para salvar editais.',
  semEdital: 'Edital não encontrado.',
  naoSalvo: 'Este edital não está nos seus salvos.',
  descartadosCheio: 'Você chegou a 500 editais descartados. Remova alguns em Minhas Oportunidades.',
  falha: 'Não foi possível salvar agora. Tente de novo.',
} as const;

export const CONFIRMAR_REMOVER = 'Remover este edital dos salvos? O status e a observação também saem.';
export const TEXTO_STATUS_PESSOAL = 'Os status são só seus: não mudam a situação oficial do edital no PNCP.';

const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const falha = (erro: string): Resultado<never> => ({ ok: false, erro });

export function lerIdContratacao(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 40 && ID_CONTRATACAO.test(v) ? v : null;
}

export function lerStatus(v: unknown): StatusSalvo | null {
  return typeof v === 'string' && (STATUS_SALVO as readonly string[]).includes(v) ? (v as StatusSalvo) : null;
}

/** POST /api/salvos: { id, status? } (padrão "salvo"). O dono vem da sessão: o resto do corpo é ignorado. */
export function validarSalvar(corpo: unknown): Resultado<{ id: string; status: StatusSalvo }> {
  if (!objeto(corpo)) return falha(MENSAGENS_SALVOS.formulario);
  const id = lerIdContratacao(corpo.id);
  if (!id) return falha(MENSAGENS_SALVOS.formulario);
  const status = corpo.status === undefined ? 'salvo' : lerStatus(corpo.status);
  if (!status) return falha(MENSAGENS_SALVOS.status);
  return { ok: true, valor: { id, status } };
}

export type MudancaSalvo = { id: string; status?: StatusSalvo; observacao?: string | null };

/** PATCH /api/salvos: { id, status?, observacao? } (pelo menos um). Observação aparada; vazia = null. */
export function validarMudanca(corpo: unknown): Resultado<MudancaSalvo> {
  if (!objeto(corpo)) return falha(MENSAGENS_SALVOS.formulario);
  const id = lerIdContratacao(corpo.id);
  if (!id) return falha(MENSAGENS_SALVOS.formulario);
  const mudanca: MudancaSalvo = { id };
  if (corpo.status !== undefined) {
    const status = lerStatus(corpo.status);
    if (!status) return falha(MENSAGENS_SALVOS.status);
    mudanca.status = status;
  }
  if (corpo.observacao !== undefined) {
    if (corpo.observacao !== null && typeof corpo.observacao !== 'string') return falha(MENSAGENS_SALVOS.formulario);
    const texto = (corpo.observacao ?? '').trim();
    if (texto.length > MAX_OBSERVACAO) return falha(MENSAGENS_SALVOS.observacao);
    mudanca.observacao = texto || null;
  }
  if (mudanca.status === undefined && mudanca.observacao === undefined) return falha(MENSAGENS_SALVOS.formulario);
  return { ok: true, valor: mudanca };
}

export function validarRemocao(corpo: unknown): Resultado<{ id: string }> {
  if (!objeto(corpo)) return falha(MENSAGENS_SALVOS.formulario);
  const id = lerIdContratacao(corpo.id);
  return id ? { ok: true, valor: { id } } : falha(MENSAGENS_SALVOS.formulario);
}

/** O que os botões precisam saber de cada edital da conta: o status e se tem observação. */
export type EstadoSalvo = { status: StatusSalvo; nota: boolean };
export type MapaSalvos = Record<string, EstadoSalvo>;

/** Remover um salvo com status (além de "Salvo") ou observação pede confirmação. */
export function precisaConfirmar(e: EstadoSalvo): boolean {
  return e.status !== 'salvo' || e.nota;
}

export type FiltroStatus = 'todos' | StatusSalvo;
export const FILTROS_STATUS: readonly FiltroStatus[] = ['todos', 'salvo', 'analise', 'participar', 'descartado'];
export const ROTULO_FILTRO: Record<FiltroStatus, string> = { todos: 'Todos', ...ROTULO_STATUS };

/** Contagem por aba. "Todos" = salvos fora os descartados (descartados só na aba deles). */
export function contarPorStatus(status: readonly StatusSalvo[]): Record<FiltroStatus, number> {
  const c: Record<FiltroStatus, number> = { todos: 0, salvo: 0, analise: 0, participar: 0, descartado: 0 };
  for (const s of status) {
    c[s]++;
    if (s !== 'descartado') c.todos++;
  }
  return c;
}

export function idsDescartados(m: MapaSalvos): string[] {
  return Object.entries(m)
    .filter(([, e]) => e.status === 'descartado')
    .map(([id]) => id)
    .sort();
}

export type EditalSalvo = {
  slug: string;
  objeto: string;
  orgao_nome: string;
  municipio_nome: string | null;
  uf: string;
  valor_estimado: number | null;
  encerramento_em: string | null;
  situacao_id: number | null;
};
export type SalvoDaConta = { id: string; status: StatusSalvo; observacao: string | null; salvoEm: string; atualizadoEm: string; edital: EditalSalvo | null };

const textoOuNulo = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const numeroOuNulo = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Linha de salvos_da_conta (numeric chega como texto) → SalvoDaConta. Contratação que não existe mais: edital null. */
export function salvoDaLinha(l: Record<string, unknown>): SalvoDaConta {
  const edital: EditalSalvo | null =
    typeof l.slug === 'string' && typeof l.objeto === 'string'
      ? {
          slug: l.slug,
          objeto: l.objeto,
          orgao_nome: String(l.orgao_nome ?? ''),
          municipio_nome: textoOuNulo(l.municipio_nome),
          uf: String(l.uf ?? ''),
          valor_estimado: numeroOuNulo(l.valor_estimado),
          encerramento_em: textoOuNulo(l.encerramento_em),
          situacao_id: numeroOuNulo(l.situacao_id),
        }
      : null;
  return {
    id: String(l.contratacao_id),
    status: lerStatus(l.status) ?? 'salvo',
    observacao: typeof l.observacao === 'string' ? l.observacao : null,
    salvoEm: String(l.criado_em),
    atualizadoEm: String(l.atualizado_em),
    edital,
  };
}

export type OrdemSalvos = 'prazo' | 'salvo';
export type NavegacaoSalvos = { status: FiltroStatus; ordem: OrdemSalvos };

export function lerNavegacaoSalvos(p: URLSearchParams): NavegacaoSalvos {
  const s = p.get('status') ?? '';
  return {
    status: (FILTROS_STATUS as readonly string[]).includes(s) ? (s as FiltroStatus) : 'todos',
    ordem: p.get('ordem') === 'salvo' ? 'salvo' : 'prazo',
  };
}

/** Endereço de Minhas Oportunidades; "Todos" e a ordem por prazo (padrões) ficam fora. */
export function urlDosSalvos(n: NavegacaoSalvos): string {
  const p = new URLSearchParams();
  if (n.status !== 'todos') p.set('status', n.status);
  if (n.ordem !== 'prazo') p.set('ordem', n.ordem);
  const s = p.toString();
  return s ? `/oportunidades?${s}` : '/oportunidades';
}

/** A aba (Todos = sem os descartados) na ordem: prazo (mais próximo primeiro; sem prazo no fim) ou data de salvamento. */
export function salvosDaAba(lista: readonly SalvoDaConta[], n: NavegacaoSalvos): SalvoDaConta[] {
  const daAba = lista.filter((s) => (n.status === 'todos' ? s.status !== 'descartado' : s.status === n.status));
  const prazo = (s: SalvoDaConta) => (s.edital?.encerramento_em ? Date.parse(s.edital.encerramento_em) : Number.POSITIVE_INFINITY);
  const recente = (a: SalvoDaConta, b: SalvoDaConta) => Date.parse(b.salvoEm) - Date.parse(a.salvoEm);
  return [...daAba].sort((a, b) => (n.ordem === 'salvo' ? recente(a, b) : prazo(a) - prazo(b) || recente(a, b)));
}

/** Situação oficial: Suspensa/Revogada/Anulada pelo PNCP, Encerrada pelo prazo, Indisponível sem o edital. */
export function situacaoOficial(e: EditalSalvo | null, agora: Date): 'Suspensa' | 'Revogada' | 'Anulada' | 'Encerrada' | 'Indisponível' | null {
  if (!e) return 'Indisponível';
  const r = rotuloSituacao(e.situacao_id);
  if (r === 'Revogada' || r === 'Anulada') return r;
  if (e.encerramento_em && Date.parse(e.encerramento_em) <= agora.getTime()) return 'Encerrada';
  return r;
}
