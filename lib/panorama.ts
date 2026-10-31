import { NOMES_UF } from './estados';
import { moedaCurta, numero } from './formato';
import { MODALIDADES } from './seo/modalidades';

/** Quantos assuntos entram na tabela da página /panorama. */
export const TOPO_ASSUNTOS = 15;

/** Resultado de panorama_abertos() (0025). */
export type PanoramaBruto = {
  total: number;
  com_valor: number;
  mediana_valor: number | null;
  encerram_7_dias: number;
  publicados_7_dias: number;
  por_modalidade: Array<{ modalidade_id: number; total: number; mediana_valor: number | null }>;
  por_uf: Array<{ uf: string; total: number }>;
};

export type AssuntoContado = { slug: string; nome: string; total: number };

const porcentagem = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0);
const doMaior = <T extends { total: number }>(a: T, b: T) => b.total - a.total;

/** Da resposta do banco para o que a página mostra (ordem, porcentagens e endereços). */
export function montarPanorama(b: PanoramaBruto, assuntos: readonly AssuntoContado[]) {
  return {
    total: b.total,
    medianaValor: b.mediana_valor,
    comValorPorcentagem: porcentagem(b.com_valor, b.total),
    encerramSete: b.encerram_7_dias,
    encerramSetePorcentagem: porcentagem(b.encerram_7_dias, b.total),
    publicadosSete: b.publicados_7_dias,
    modalidades: b.por_modalidade
      .flatMap((l) => {
        const m = MODALIDADES.find((x) => x.id === l.modalidade_id);
        if (!m) return [];
        return [{ id: m.id, nome: m.nome, caminho: `/licitacoes/${m.slug}`, total: l.total, porcentagem: porcentagem(l.total, b.total), medianaValor: l.mediana_valor }];
      })
      .sort(doMaior),
    ufs: b.por_uf
      .flatMap((l) => {
        const nome = NOMES_UF[l.uf];
        if (!nome) return [];
        return [{ uf: l.uf, nome, caminho: `/licitacoes/${l.uf.toLowerCase()}`, total: l.total, porcentagem: porcentagem(l.total, b.total) }];
      })
      .sort(doMaior),
    assuntos: assuntos
      .filter((a) => a.total > 0)
      .map((a) => ({ ...a, caminho: `/licitacoes/${a.slug}` }))
      .sort(doMaior)
      .slice(0, TOPO_ASSUNTOS),
  };
}

export type Panorama = ReturnType<typeof montarPanorama>;

export const porcento = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export const dataPorExtenso = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

/** Primeiro parágrafo da página: a resposta direta, com os números do momento. */
export function respostaDoPanorama(p: Panorama, atualizadoEm: string): string {
  const estado = p.ufs[0];
  const lider = estado ? ` ${estado.nome} tem a maior parte, com ${numero(estado.total)} editais (${porcento(estado.porcentagem)}).` : '';
  const valor = p.medianaValor ? ` O valor estimado mediano é de ${moedaCurta(p.medianaValor)}.` : '';
  return `Em ${dataPorExtenso(atualizadoEm)}, o Brasil tem ${numero(p.total)} editais abertos publicados no PNCP, nas cinco modalidades que o Edital Map acompanha.${lider}${valor}`;
}
