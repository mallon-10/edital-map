import type { Limite } from '../limites';
import type { FiltrosTela, ResultadoBusca } from '../tipos';
import type { Tela } from '../urlBusca';

/** Estado da página inicial guardado ao sair dela, para voltar do edital com a mesma busca, lista, tela e posição. */
export type Volta = {
  /** Endereço (urlDaBusca) em que o estado vale. */
  endereco: string;
  filtros: FiltrosTela;
  /** Última busca que o mapa mostrou (com o limite do dia, o mapa fica com a última permitida). */
  filtrosMapa: FiltrosTela;
  resultado: ResultadoBusca;
  limite: Limite | null;
  tela: Tela;
  selecionadoId: string | null;
  /** Posição da lista (scrollTop). */
  rolagem: number;
};

export type Armazem = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const CHAVE_VOLTA = 'em_volta';
const CHAVE_ULTIMA = 'em_ultima_busca';

/** sessionStorage da aba; null no servidor ou quando o navegador bloqueia. */
function daAba(): Armazem | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function guardarVolta(v: Volta, a: Armazem | null = daAba()): void {
  try {
    a?.setItem(CHAVE_VOLTA, JSON.stringify(v));
  } catch {
    // cheio ou bloqueado: a volta só não restaura
  }
}

/** Lê e apaga (vale uma vez). Só devolve o estado do mesmo endereço. */
export function tomarVolta(endereco: string, a: Armazem | null = daAba()): Volta | null {
  try {
    const bruto = a?.getItem(CHAVE_VOLTA) ?? null;
    a?.removeItem(CHAVE_VOLTA);
    if (!bruto) return null;
    const v = JSON.parse(bruto) as Partial<Volta> | null;
    return v && v.endereco === endereco && v.filtros && v.filtrosMapa && v.resultado ? (v as Volta) : null;
  } catch {
    return null;
  }
}

export function guardarUltimaBusca(endereco: string, a: Armazem | null = daAba()): void {
  try {
    a?.setItem(CHAVE_ULTIMA, endereco);
  } catch {
    // sem armazenamento: a barra leva à página inicial vazia
  }
}

/** Última busca da página inicial ('/' quando não há, ou quando o valor guardado não é um endereço da página inicial). */
export function lerUltimaBusca(a: Armazem | null = daAba()): string {
  try {
    const v = a?.getItem(CHAVE_ULTIMA) ?? null;
    return v && (v === '/' || v.startsWith('/?')) ? v : '/';
  } catch {
    return '/';
  }
}
