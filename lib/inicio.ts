import { NOMES_UF } from './estados';
import { numero } from './formato';
import { chave, separarNegativos } from './relevancia/termos';
import { ASSUNTOS, naUf } from './seo/assuntos';
import { POR_PAGINA } from './filtros';
import type { EditalResumo, FiltrosTela, ResultadoBusca } from './tipos';

/** Onde se busca, em texto corrido ("em Santa Catarina", "a 50 km de Joinville/SC"); sem lugar, vazio. */
export function localDaBusca(f: Pick<FiltrosTela, 'uf' | 'cidade' | 'raio'>): string {
  if (f.cidade) {
    const lugar = `${f.cidade.nome}/${f.cidade.uf}`;
    return f.raio ? `a ${f.raio} km de ${lugar}` : `em ${lugar}`;
  }
  return f.uf && NOMES_UF[f.uf] ? naUf(f.uf) : '';
}

/** Título do cartão do topo da página inicial: o que se busca e onde ("Uniforme em Santa Catarina"). */
export function tituloDaBusca(f: FiltrosTela): string {
  const termo = separarNegativos(f.q).positivo.replace(/\s+/g, ' ').trim();
  const oque = termo ? termo.charAt(0).toLocaleUpperCase('pt-BR') + termo.slice(1) : 'Licitações abertas';
  return `${oque} ${localDaBusca(f) || 'no Brasil'}`;
}

/** Confirmação depois da busca: quantos, o quê e onde. Sem termo nem lugar não há o que confirmar. */
export function textoDoResultado(f: FiltrosTela, total: number): string | null {
  const termo = separarNegativos(f.q).positivo.replace(/\s+/g, ' ').trim();
  const lugar = localDaBusca(f);
  if (!termo && !lugar) return null;
  const alvo = [termo ? `para ${termo}` : '', lugar].filter(Boolean).join(' ');
  if (total === 0) return `Nenhum edital aberto ${alvo}`;
  return `${numero(total)} ${total === 1 ? 'edital encontrado' : 'editais encontrados'} ${alvo}`;
}

export type IconeAtalho = 'camisa' | 'capacete' | 'brilho' | 'monitor' | 'talheres' | 'cruz';
export type Atalho = { slug: string; rotulo: string; termo: string; icone: IconeAtalho };

const ROTULOS: ReadonlyArray<[slug: string, rotulo: string, icone: IconeAtalho]> = [
  ['uniformes', 'Uniformes', 'camisa'],
  ['epi', 'EPI', 'capacete'],
  ['limpeza', 'Limpeza', 'brilho'],
  ['informatica', 'Informática', 'monitor'],
  ['alimentos', 'Alimentos', 'talheres'],
  ['hospitalar', 'Hospitalar', 'cruz'],
];

/** Atalhos de assunto da página inicial: o termo é o mesmo da página /licitacoes/{slug}. */
export const ATALHOS: readonly Atalho[] = ROTULOS.map(([slug, rotulo, icone]) => {
  const assunto = ASSUNTOS.find((a) => a.slug === slug);
  if (!assunto) throw new Error(`assunto ${slug} fora de lib/seo/assuntos.ts`);
  return { slug, rotulo, termo: assunto.termo, icone };
});

/** Slug do atalho que é a busca atual (o termo ou o rótulo, sem acento, caixa nem plural), ou null. */
export function atalhoAtivo(q: string): string | null {
  const k = chave(q);
  if (!k) return null;
  return ATALHOS.find((a) => chave(a.termo) === k || chave(a.rotulo) === k)?.slug ?? null;
}

export function hrefDoAtalho(a: Atalho, uf: string): string {
  const p = new URLSearchParams({ q: a.termo });
  if (uf) p.set('uf', uf);
  return `/?${p}`;
}

/** Fechar a oferta do Pro esconde o cartão por estes dias (localStorage `em_oferta_fechada`, com a hora em ms). */
export const OFERTA_FECHADA_DIAS = 7;
export const CHAVE_OFERTA_FECHADA = 'em_oferta_fechada';

export function ofertaFechada(valor: string | null, agora: Date): boolean {
  const quando = Number(valor);
  if (!valor || !Number.isFinite(quando)) return false;
  const passou = agora.getTime() - quando;
  return passou >= 0 && passou < OFERTA_FECHADA_DIAS * 86_400_000;
}

/**
 * Lista que carrega ao rolar: a próxima página depois das que estão na tela (20 por página), contando da primeira que o
 * endereço pediu (um link antigo com `pagina=N` começa nela). Arredonda para cima: um repetido tirado não pede a mesma.
 */
export function proximaPagina(primeira: number, carregados: number): number {
  return primeira + Math.ceil(carregados / POR_PAGINA);
}

/** Altura em que a lista para depois da rolagem (scroll-mt-3). */
const TOPO_DA_LISTA = 12;

/**
 * A resposta da busca muda a altura do que vem antes da lista (o botão "Ver os N editais" encolhe e volta a caber na
 * linha): a lista sai do lugar. Só pequenos desvios: bem longe, foi a pessoa que rolou, e ela não é puxada de volta.
 */
export function precisaRealinhar(topo: number): boolean {
  const desvio = Math.abs(topo - TOPO_DA_LISTA);
  return desvio > 4 && desvio <= 150;
}

/** Índice do edital depois do qual entra um cartão no meio da lista: o 5º ou, em lista curta, o último. */
export function posicaoNoMeio(editais: number): number {
  return Math.min(4, editais - 1);
}

/** Acrescenta a página nova sem repetir (um edital novo no banco empurra outro para a página seguinte). */
export function juntarEditais(antigos: readonly EditalResumo[], novos: readonly EditalResumo[]): EditalResumo[] {
  const vistos = new Set(antigos.map((e) => e.id));
  return [...antigos, ...novos.filter((e) => !vistos.has(e.id))];
}

export function temMais(r: ResultadoBusca): boolean {
  return r.editais.length < r.total;
}
