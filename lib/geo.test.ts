import { describe, expect, it } from 'vitest';
import { paraGeoJSON } from './geo';

describe('paraGeoJSON', () => {
  it('converte pontos em features com [lng, lat]', () => {
    const g = paraGeoJSON([
      { codigo_ibge: '4314902', nome: 'Porto Alegre', uf: 'RS', lat: -30.03, lng: -51.2, qtd: 367, valor_total: 1000, prazo_mais_proximo: '2026-10-15T20:00:00Z' },
      { codigo_ibge: '4202404', nome: 'Blumenau', uf: 'SC', lat: -26.9, lng: -49.07, qtd: 3, valor_total: null, prazo_mais_proximo: '2026-10-16T20:00:00Z' },
    ]);
    expect(g.type).toBe('FeatureCollection');
    expect(g.features[0]).toEqual({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-51.2, -30.03] },
      properties: { ibge: '4314902', nome: 'Porto Alegre', uf: 'RS', qtd: 367, valor: 1000 },
    });
    expect(g.features[1].properties.valor).toBe(0);
  });
});
