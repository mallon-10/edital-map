import type { ExpressionSpecification, LayerSpecification, LineLayerSpecification, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import { moedaCurta, numero, numeroCurto } from './formato';

/** Fundo do mapa: OpenFreeMap (gratuito, sem chave), estilo cinza claro. */
export const URL_ESTILO = 'https://tiles.openfreemap.org/styles/positron';
/** Sem resposta nesse tempo, o mapa monta a reserva. */
const ESPERA_ESTILO_MS = 8000;
const FONTE_NOMES = ['Noto Sans Bold'];
export const ID_DIVISAS = 'divisas-estados';
/** Nome dos lugares do fundo em português, quando houver. */
export const NOME_PT: ExpressionSpecification = ['coalesce', ['get', 'name:pt'], ['get', 'name']];

const PINTURA_DIVISAS: LineLayerSpecification['paint'] = {
  'line-color': '#0c2340',
  'line-opacity': 0.8,
  'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 7, 1.6],
};

/** Divisas estaduais dos próprios tiles (batem com o litoral do fundo, ao contrário do nosso contorno simplificado). */
const DIVISAS: LineLayerSpecification = {
  id: ID_DIVISAS,
  type: 'line',
  source: 'openmaptiles',
  'source-layer': 'boundary',
  filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
  layout: { 'line-join': 'round' },
  paint: PINTURA_DIVISAS,
};

/** O que o MapLibre entrega por pílula: cidade (de paraGeoJSON) ou grupo (cluster, com as somas de clusterProperties). */
export type PropsPilula = {
  cluster?: boolean;
  cluster_id?: number;
  ibge?: string;
  nome?: string;
  uf?: string;
  qtd: number;
  valor: number;
  destaque: number;
};
export type Pilula = { chave: string; texto: string; rotulo: string; grupo: boolean; destaque: boolean };

const editais = (n: number) => `${numero(n)} ${n === 1 ? 'edital aberto' : 'editais abertos'}`;

export function pilula(p: PropsPilula): Pilula {
  const grupo = p.cluster === true;
  const qtd = Number(p.qtd);
  return {
    chave: grupo ? `g${p.cluster_id}` : `c${p.ibge}`,
    texto: numeroCurto(qtd),
    rotulo: grupo ? `${editais(qtd)} nesta região. Aproximar` : `${p.nome}/${p.uf}: ${editais(qtd)}`,
    grupo,
    destaque: Number(p.destaque) > 0,
  };
}

/** Linhas da dica ao passar o mouse; a primeira vai em negrito. */
export function linhasDica(p: PropsPilula): string[] {
  const valor = moedaCurta(Number(p.valor ?? 0));
  const qtd = Number(p.qtd);
  if (p.cluster === true) return [editais(qtd), ...(valor ? [valor] : []), 'Aproxime para ver as cidades'];
  return [`${p.nome}/${p.uf}`, editais(qtd), ...(valor ? [valor] : [])];
}

/** Estilo do OpenFreeMap ajustado: rótulos em português, nome de estado do fundo escondido e nossas divisas por cima das fronteiras. */
export function ajustarEstilo(estilo: StyleSpecification): StyleSpecification {
  const layers: LayerSpecification[] = [];
  let comDivisas = false;
  for (const l of estilo.layers) {
    const campo = l.type === 'symbol' ? l.layout?.['text-field'] : undefined;
    if (l.type === 'symbol' && campo !== undefined) {
      const esconder = l.id === 'label_state' ? { visibility: 'none' as const } : {};
      // Só troca o que mostra nome (name, name_en...); placas de rodovia mostram `ref` e ficam como vieram.
      const nome = JSON.stringify(campo).includes('"name') ? { 'text-field': NOME_PT } : {};
      layers.push({ ...l, layout: { ...l.layout, ...nome, ...esconder } });
    } else {
      layers.push(l);
    }
    if (l.id === 'boundary_3') {
      layers.push(DIVISAS);
      comDivisas = true;
    }
  }
  if (!comDivisas) {
    const primeiroRotulo = layers.findIndex((l) => l.type === 'symbol');
    layers.splice(primeiroRotulo === -1 ? layers.length : primeiroRotulo, 0, DIVISAS);
  }
  return { ...estilo, layers };
}

/** Sem o OpenFreeMap: fundo branco e o nosso contorno dos estados (sem nomes, porque as fontes também vêm de lá). */
export function estiloReserva(): StyleSpecification {
  return {
    version: 8,
    sources: { estados: { type: 'geojson', data: '/geo/estados.json' } },
    layers: [
      { id: 'fundo', type: 'background', paint: { 'background-color': '#ffffff' } },
      { id: ID_DIVISAS, type: 'line', source: 'estados', paint: { ...PINTURA_DIVISAS, 'line-width': 1 } },
    ],
  };
}

/** Baixa e ajusta o estilo do fundo; erro, resposta ruim ou demora viram a reserva, sem aviso ao usuário. */
export async function carregarEstilo(buscar: typeof fetch = fetch, ms = ESPERA_ESTILO_MS): Promise<StyleSpecification> {
  try {
    const r = await buscar(URL_ESTILO, { signal: AbortSignal.timeout(ms) });
    if (!r.ok) return estiloReserva();
    return ajustarEstilo((await r.json()) as StyleSpecification);
  } catch {
    return estiloReserva();
  }
}

/** Nome de cada estado (fonte `nomes-estados`, de public/geo/estados-rotulos.json). Some quando colide e volta ao aproximar. */
export const CAMADA_NOMES_ESTADOS: SymbolLayerSpecification = {
  id: 'nomes-estados',
  type: 'symbol',
  source: 'nomes-estados',
  layout: {
    'text-field': ['upcase', ['get', 'nome']],
    'text-font': FONTE_NOMES,
    'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 6, 14],
    'text-letter-spacing': 0.12,
    'text-max-width': 7,
    'text-padding': 4,
  },
  paint: { 'text-color': '#3e5373', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
};

/**
 * Texto invisível no lugar de cada pílula (fonte `editais`), acima dos nomes: as pílulas são HTML e não entram na
 * colisão do MapLibre; isto reserva o espaço delas para os nomes dos estados não ficarem por baixo.
 * Tamanho e deslocamento aproximam a pílula (12 px, acima do ponto).
 */
export const CAMADA_ESPACO_PILULAS: SymbolLayerSpecification = {
  id: 'espaco-pilulas',
  type: 'symbol',
  source: 'editais',
  layout: {
    'text-field': ['to-string', ['get', 'qtd']],
    'text-font': FONTE_NOMES,
    'text-size': 12,
    'text-anchor': 'bottom',
    'text-offset': [0, -0.6],
    'text-padding': 10,
    'text-allow-overlap': true,
    'text-ignore-placement': false,
  },
  paint: { 'text-opacity': 0 },
};
