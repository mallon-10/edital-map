import { adicionarTermos, LIMITES_RADAR, palavraValida, rascunhoDoRadar, type RascunhoRadar } from './radar';
import { chave, GRUPOS, separarNegativos } from './relevancia/termos';
import { ASSUNTOS } from './seo/assuntos';
import type { FiltrosTela } from './tipos';

/**
 * Do que a pessoa acabou de buscar (ou do edital que abriu) ao alerta, sem recomeçar: o endereço de /alertas/novo leva
 * termo, UF, município, valor e modalidades. Raio, órgão e prazo ficam de fora: o alerta não guarda esses filtros, e a
 * prévia não promete o que o envio não faz.
 */
type FiltrosDoAlerta = Pick<FiltrosTela, 'q' | 'uf' | 'cidade' | 'valorMin' | 'modalidades'>;

export function hrefAlertaDaBusca(f: FiltrosDoAlerta): string {
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.set('q', q);
  if (f.uf) p.set('uf', f.uf);
  if (f.cidade) p.set('municipio', f.cidade.ibge);
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  const texto = p.toString();
  return texto ? `/alertas/novo?${texto}` : '/alertas/novo';
}

/** O endereço de /alertas/novo trouxe algo da busca (não basta `de=radar`). */
export function previaTemFiltro(p: URLSearchParams): boolean {
  return ['q', 'uf', 'municipio', 'valor', 'modalidades'].some((n) => p.has(n));
}

/** Filtros da busca → formulário do alerta. Município vale sozinho: o radar aceita estados ou municípios, não os dois. */
export function rascunhoDaBusca(f: FiltrosDoAlerta): RascunhoRadar {
  const { positivo, negativos } = separarNegativos(f.q);
  return rascunhoDoRadar(
    {
      termos: adicionarTermos([], positivo, LIMITES_RADAR.termos),
      termosExcluir: negativos.filter(palavraValida).slice(0, LIMITES_RADAR.excluir),
      ufs: !f.cidade && f.uf ? [f.uf] : [],
      municipios: f.cidade ? [f.cidade.ibge] : [],
      valorMin: f.valorMin,
      valorMax: null,
      modalidades: f.modalidades,
      soMeEpp: false,
    },
    f.cidade ? [f.cidade] : [],
  );
}

let termosDosAssuntos: ReadonlyArray<{ k: string; termo: string }> | null = null;

/** Termos de todos os assuntos, do mais longo ao mais curto ("uniforme escolar" ganha de "uniforme"). */
function porAssunto() {
  termosDosAssuntos ??= ASSUNTOS.flatMap((a) => {
    const termos = GRUPOS.find((g) => g.assunto === a.grupo)?.termos ?? [];
    return [...termos, a.termo].map((t) => ({ k: chave(t), termo: t }));
  }).sort((x, y) => y.k.length - x.k.length);
  return termosDosAssuntos;
}

/**
 * Segmento do edital pelo objeto, para monitorar parecidos: o termo do catálogo que bateu, não o nome do ramo ("luvas de
 * procedimento" não vira "medicamento"). Nenhum termo conhecido: null, sem inventar segmento.
 */
export function segmentoDoEdital(objeto: string): { termo: string } | null {
  const texto = ` ${chave(objeto)} `;
  const achado = porAssunto().find((t) => texto.includes(` ${t.k} `));
  return achado ? { termo: achado.termo } : null;
}

export function hrefMonitorarEdital(objeto: string, uf: string): string {
  return hrefAlertaDaBusca({ q: segmentoDoEdital(objeto)?.termo ?? '', uf, cidade: null, valorMin: null, modalidades: [] });
}

const listaDeTextos = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Rascunho guardado antes da compra, para o onboarding abrir preenchido. Qualquer coisa fora do formato: nada. */
export function lerRascunhoGuardado(bruto: string | null): RascunhoRadar | null {
  if (!bruto) return null;
  try {
    const r = JSON.parse(bruto) as Partial<RascunhoRadar> | null;
    if (!r || !listaDeTextos(r.termos) || !r.termos?.length || !listaDeTextos(r.ufs) || !Array.isArray(r.municipios)) return null;
    return { ...rascunhoDoRadar(null, []), ...r };
  } catch {
    return null;
  }
}
