import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type { PontoMapa } from './tipos';

export type PropsPonto = { ibge: string; nome: string; uf: string; qtd: number; valor: number; destaque: 0 | 1 };

/** Pontos do mapa em GeoJSON; `destaque` (código IBGE da cidade do edital selecionado) marca essa cidade com 1. */
export function paraGeoJSON(pontos: PontoMapa[], destaque: string | null = null): FeatureCollection<Point, PropsPonto> {
  return {
    type: 'FeatureCollection',
    features: pontos.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { ibge: p.codigo_ibge, nome: p.nome, uf: p.uf, qtd: p.qtd, valor: p.valor_total ?? 0, destaque: p.codigo_ibge === destaque ? 1 : 0 },
    })),
  };
}

/** Área do filtro de raio no mapa: centro (sede do município, [lng, lat]) e raio em km. */
export type Raio = { lng: number; lat: number; km: number };

const RAIO_TERRA_KM = 6371;
const rad = (g: number) => (g * Math.PI) / 180;
const graus = (r: number) => (r * 180) / Math.PI;

/** Distância em km entre dois pontos [lng, lat] (haversine, a mesma conta de municipios_no_raio na 0007). */
export function distanciaKm(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Círculo de `km` em volta de [lng, lat] como polígono de `passos` lados (anel fechado: o último ponto repete o primeiro). */
export function circulo(lng: number, lat: number, km: number, passos = 64): Feature<Polygon> {
  const d = km / RAIO_TERRA_KM;
  const f1 = rad(lat);
  const l1 = rad(lng);
  const anel: [number, number][] = [];
  for (let i = 0; i <= passos; i++) {
    const rumo = (2 * Math.PI * (i % passos)) / passos;
    const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(rumo));
    const l2 = l1 + Math.atan2(Math.sin(rumo) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
    anel.push([graus(l2), graus(f2)]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [anel] }, properties: {} };
}

/** Caixa [[oeste, sul], [leste, norte]] do círculo, para enquadrar o mapa. */
export function limitesDoCirculo(c: Feature<Polygon>): Limites {
  const anel = c.geometry.coordinates[0];
  const lngs = anel.map((p) => p[0]);
  const lats = anel.map((p) => p[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/** GeoJSON da área do raio: vazio sem raio. */
export function areaDoRaio(r: Raio | null): FeatureCollection<Polygon> {
  return { type: 'FeatureCollection', features: r ? [circulo(r.lng, r.lat, r.km)] : [] };
}

/** Caixa [[oeste, sul], [leste, norte]]. */
export type Limites = [[number, number], [number, number]];

/** O Brasil inteiro: enquadramento inicial do mapa e a volta quando não há município nem raio. */
export const BRASIL: Limites = [[-74.2, -33.9], [-34.6, 5.4]];

/** Município escolhido sem raio: o mapa mostra a cidade e os vizinhos (círculo invisível deste tamanho em volta da sede). */
export const RAIO_MUNICIPIO_KM = 25;

/**
 * Para onde o mapa vai: o raio vence (é a área da busca); sem ele, a sede do município ([lng, lat]) com RAIO_MUNICIPIO_KM;
 * sem os dois, null (o Brasil inteiro).
 */
export function enquadramento(raio: Raio | null, sede: [number, number] | null): Limites | null {
  if (raio) return limitesDoCirculo(circulo(raio.lng, raio.lat, raio.km));
  if (sede) return limitesDoCirculo(circulo(sede[0], sede[1], RAIO_MUNICIPIO_KM));
  return null;
}
