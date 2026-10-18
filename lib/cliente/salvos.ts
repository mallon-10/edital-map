import { useEffect, useSyncExternalStore } from 'react';
import { bloqueioSalvar, lerPlano, type NivelConta } from '../limitesConta';
import type { EstadoSalvo, MapaSalvos, StatusSalvo } from '../salvos';
import { lerConta } from './conta';
import { pedirJson, type RespostaAcao } from './pedido';

/**
 * Salvos da conta no navegador: um GET /api/salvos por carga de página (só com conta; sem conta nem pergunta) e um
 * estado único que todos os botões da página leem (useSyncExternalStore). O servidor decide de verdade (limites, dono):
 * a mudança aparece na hora e volta ao que era se a rota recusar.
 */

export type EstadoSalvos =
  | { fase: 'carregando' }
  | { fase: 'anonimo' }
  | { fase: 'erro' }
  | { fase: 'pronto'; plano: NivelConta; limite: number; usados: number; salvos: MapaSalvos };

const INICIAL: EstadoSalvos = { fase: 'carregando' };
let estado: EstadoSalvos = INICIAL;
let pedido: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

function publicar(novo: EstadoSalvos): void {
  estado = novo;
  for (const f of ouvintes) f();
}

/** O estado agora (fora do React). */
export function lerSalvos(): EstadoSalvos {
  return estado;
}

export function estadoDaResposta(ok: boolean, corpo: unknown): EstadoSalvos {
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as Record<string, unknown>;
  if (ok && c.conta === false) return { fase: 'anonimo' };
  if (!ok || c.conta !== true || typeof c.salvos !== 'object' || c.salvos === null) return { fase: 'erro' };
  return { fase: 'pronto', plano: lerPlano(c.plano), limite: Number(c.limite ?? 0), usados: Number(c.usados ?? 0), salvos: c.salvos as MapaSalvos };
}

/** Um edital com o estado dado (undefined = fora dos salvos); usados = salvos fora os descartados. */
function comEdital(e: EstadoSalvos, id: string, valor: EstadoSalvo | undefined): EstadoSalvos {
  if (e.fase !== 'pronto') return e;
  const salvos: MapaSalvos = { ...e.salvos };
  if (valor) salvos[id] = valor;
  else delete salvos[id];
  return { ...e, salvos, usados: Object.values(salvos).filter((s) => s.status !== 'descartado').length };
}

export type Acao = { status: StatusSalvo } | { remover: true };

export function aplicarAcao(e: EstadoSalvos, id: string, a: Acao): EstadoSalvos {
  if (e.fase !== 'pronto') return e;
  return comEdital(e, id, 'remover' in a ? undefined : { status: a.status, nota: e.salvos[id]?.nota ?? false });
}

/** Ação recusada pelo servidor: o edital volta ao que era antes do toque (o resto do estado fica como está). */
export function voltarSalvo(e: EstadoSalvos, id: string, anterior: EstadoSalvo | undefined): EstadoSalvos {
  return comEdital(e, id, anterior);
}

export type AcaoBotao = 'carregando' | 'entrar' | 'bloqueado' | 'salvar' | 'remover';

/** Um toque no "Salvar": entrar, convite aos planos (grátis ou no limite), salvar ou remover. Erro ao carregar: tenta salvar (o servidor responde). */
export function acaoDoBotao(e: EstadoSalvos, id: string): AcaoBotao {
  if (e.fase === 'carregando') return 'carregando';
  if (e.fase === 'anonimo') return 'entrar';
  if (e.fase === 'erro') return 'salvar';
  const atual = e.salvos[id];
  if (atual && atual.status !== 'descartado') return 'remover';
  return bloqueioSalvar(e.plano, e.usados) ? 'bloqueado' : 'salvar';
}

export function carregarSalvos(): Promise<void> {
  pedido ??= lerConta()
    .then(async (email) => {
      if (!email) return publicar({ fase: 'anonimo' });
      const r = await fetch('/api/salvos', { cache: 'no-store' });
      publicar(estadoDaResposta(r.ok, await r.json().catch(() => null)));
    })
    .catch(() => publicar({ fase: 'erro' }));
  return pedido;
}

/** Depois de sair (e nos testes): o próximo uso pergunta de novo. */
export function esquecerSalvos(): void {
  pedido = null;
  publicar(INICIAL);
}

export function useSalvos(): EstadoSalvos {
  useEffect(() => {
    void carregarSalvos();
  }, []);
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => {
        ouvintes.delete(f);
      };
    },
    () => estado,
    () => INICIAL,
  );
}

/**
 * Salvar, descartar (POST) ou remover (DELETE). Todos os botões da página mudam na hora; recusado (sem sessão, plano,
 * limite, falha), o edital volta ao que era. Aceito depois de um GET que falhou: pergunta o estado de novo.
 */
export async function mudarSalvo(id: string, a: Acao): Promise<RespostaAcao> {
  const anterior = estado.fase === 'pronto' ? estado.salvos[id] : undefined;
  publicar(aplicarAcao(estado, id, a));
  const r = 'remover' in a ? await pedirJson('/api/salvos', 'DELETE', { id }) : await pedirJson('/api/salvos', 'POST', { id, status: a.status });
  if (!r.ok) publicar(voltarSalvo(estado, id, anterior));
  else if (estado.fase === 'erro') {
    pedido = null;
    void carregarSalvos();
  }
  return r;
}

/** Minhas Oportunidades: status e/ou observação (PATCH). */
export function atualizarSalvo(id: string, mudanca: { status?: StatusSalvo; observacao?: string | null }): Promise<RespostaAcao> {
  return pedirJson('/api/salvos', 'PATCH', { id, ...mudanca });
}
