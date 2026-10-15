import type { FeatureCollection, Point } from 'geojson';
import type { PontoMapa } from './tipos';

export type PropsPonto = { ibge: string; nome: string; uf: string; qtd: number; valor: number };

export function paraGeoJSON(pontos: PontoMapa[]): FeatureCollection<Point, PropsPonto> {
  return {
    type: 'FeatureCollection',
    features: pontos.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { ibge: p.codigo_ibge, nome: p.nome, uf: p.uf, qtd: p.qtd, valor: p.valor_total ?? 0 },
    })),
  };
}
