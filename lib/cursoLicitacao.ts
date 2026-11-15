/**
 * Página de vendas em vídeo (VSL) do curso de licitação: /cursolicitacao. Tudo o que se troca sem mexer na estrutura
 * fica aqui. Parâmetros de endereço para testes: ?h=A|B|C (variação do título), ?oferta (botão visível desde o início,
 * para campanha de quem já viu o vídeo).
 */
export const CAMINHO_CURSO = '/cursolicitacao';

export const CURSO = {
  nome: 'Curso de Licitação',
  /** Linha pequena embaixo da marca. */
  assinatura: 'Do zero à primeira licitação',
  /** Preço em centavos; null = ainda não definido (a nota embaixo do botão diz "Acesso imediato"). */
  precoCentavos: null as number | null,
  /** Link do checkout da Cakto (pay.cakto.com.br/...); vazio = botão avisa que o link ainda não foi configurado. */
  checkoutUrl: '',
  video: {
    /** MP4 em public/ (H.264, 720p ou 1080p, de preferência até ~30 MB). Vazio = capa provisória e oferta liberada. */
    src: '/curso/vsl.mp4',
    /** Primeiro quadro do vídeo (aparece enquanto carrega). */
    capa: '/curso/vsl-capa.jpg',
    /** '9/16' (vertical, como a referência) ou '16/9' (horizontal). */
    proporcao: '9/16' as '9/16' | '16/9',
  },
  oferta: {
    /** O botão sobe quando faltam esses segundos para o vídeo acabar. */
    antesDoFimSeg: 10,
    /** Se o vídeo não der sinal nesse tempo, a oferta aparece (nunca fica presa). */
    esperaPlayerSeg: 20,
  },
} as const;

export const VARIACOES_TITULO = ['A', 'B', 'C'] as const;
export type VariacaoTitulo = (typeof VARIACOES_TITULO)[number];

export const variacaoDoTitulo = (valor: string | null | undefined): VariacaoTitulo => {
  const v = (valor ?? '').toUpperCase();
  return (VARIACOES_TITULO as readonly string[]).includes(v) ? (v as VariacaoTitulo) : 'A';
};

/** Rota sem rodapé nem barra do celular: a página é o vídeo. */
export const ehPaginaVsl = (caminho: string | null | undefined) => caminho === CAMINHO_CURSO || !!caminho?.startsWith(`${CAMINHO_CURSO}/`);

/** Parâmetros de campanha guardados na sessão e levados ao checkout. */
export const PARAMETROS_CAMPANHA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid', 'gclid', 'src', 'sck', 'xcod'] as const;

export function campanhaDoEndereco(busca: URLSearchParams): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const k of PARAMETROS_CAMPANHA) {
    const v = busca.get(k)?.trim();
    if (v) saida[k] = v.slice(0, 200);
  }
  return saida;
}

/** Checkout com os parâmetros de campanha da visita (sem sobrescrever o que o link já traz). Link inválido = ''. */
export function linkDoCheckout(base: string, campanha: Record<string, string>): string {
  if (!base) return '';
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    return '';
  }
  if (u.protocol !== 'https:') return '';
  for (const [k, v] of Object.entries(campanha)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  return u.toString();
}

/** Segundo do vídeo em que a oferta sobe; sem duração conhecida, null (espera o fim ou o prazo do player). */
export function momentoDaOferta(duracaoSeg: number, antesDoFimSeg: number): number | null {
  if (!Number.isFinite(duracaoSeg) || duracaoSeg <= 0) return null;
  return Math.max(0, duracaoSeg - Math.max(0, antesDoFimSeg));
}

/** Marcos de progresso (25, 50, 75, 90%) alcançados até agora e ainda não contados. */
export function marcosNovos(atualSeg: number, duracaoSeg: number, jaContados: ReadonlySet<number>): number[] {
  if (!(duracaoSeg > 0)) return [];
  const pct = (atualSeg / duracaoSeg) * 100;
  return [25, 50, 75, 90].filter((m) => pct >= m && !jaContados.has(m));
}

export const precoDoCurso = (centavos: number | null): string | null =>
  centavos === null ? null : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
