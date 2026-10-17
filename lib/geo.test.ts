import { describe, expect, it } from 'vitest';
import { areaDoRaio, BRASIL, circulo, distanciaKm, enquadramento, limitesDoCirculo, paraGeoJSON, RAIO_MUNICIPIO_KM } from './geo';

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
      properties: { ibge: '4314902', nome: 'Porto Alegre', uf: 'RS', qtd: 367, valor: 1000, destaque: 0 },
    });
    expect(g.features[1].properties.valor).toBe(0);
  });
  it('marca só a cidade selecionada (para a pílula e o grupo ficarem escuros)', () => {
    const pontos = [
      { codigo_ibge: '4314902', nome: 'Porto Alegre', uf: 'RS', lat: -30.03, lng: -51.2, qtd: 367, valor_total: 1000, prazo_mais_proximo: '2026-10-15T20:00:00Z' },
      { codigo_ibge: '4202404', nome: 'Blumenau', uf: 'SC', lat: -26.9, lng: -49.07, qtd: 3, valor_total: null, prazo_mais_proximo: '2026-10-16T20:00:00Z' },
    ];
    expect(paraGeoJSON(pontos, '4202404').features.map((f) => f.properties.destaque)).toEqual([0, 1]);
    expect(paraGeoJSON(pontos, null).features.map((f) => f.properties.destaque)).toEqual([0, 0]);
  });
});

// Sedes (lng, lat) de Joinville, Blumenau e Florianópolis.
const JOINVILLE: [number, number] = [-48.8487, -26.3045];
const BLUMENAU: [number, number] = [-49.0661, -26.9194];
const FLORIANOPOLIS: [number, number] = [-48.548, -27.5954];

describe('distanciaKm (haversine, a mesma conta de municipios_no_raio)', () => {
  it('Joinville–Blumenau dentro de 100 km; Joinville–Florianópolis fora', () => {
    const blumenau = distanciaKm(JOINVILLE, BLUMENAU);
    const florianopolis = distanciaKm(JOINVILLE, FLORIANOPOLIS);
    expect(blumenau).toBeGreaterThan(65);
    expect(blumenau).toBeLessThan(80);
    expect(florianopolis).toBeGreaterThan(140);
    expect(florianopolis).toBeLessThan(155);
  });
});

describe('circulo', () => {
  it('anel fechado de 65 pontos, todos a R km do centro', () => {
    const anel = circulo(JOINVILLE[0], JOINVILLE[1], 100).geometry.coordinates[0];
    expect(anel).toHaveLength(65);
    expect(anel[64]).toEqual(anel[0]);
    for (const p of anel) expect(distanciaKm(JOINVILLE, p as [number, number])).toBeCloseTo(100, 6);
  });
  it('a caixa do círculo tem 2R de altura (1° de latitude ≈ 111,195 km)', () => {
    const [[oeste, sul], [leste, norte]] = limitesDoCirculo(circulo(JOINVILLE[0], JOINVILLE[1], 100));
    expect(norte - sul).toBeCloseTo(200 / 111.195, 3);
    expect(oeste).toBeLessThan(JOINVILLE[0]);
    expect(leste).toBeGreaterThan(JOINVILLE[0]);
  });
});

describe('areaDoRaio', () => {
  it('vazia sem raio; um polígono com raio', () => {
    expect(areaDoRaio(null)).toEqual({ type: 'FeatureCollection', features: [] });
    expect(areaDoRaio({ lng: JOINVILLE[0], lat: JOINVILLE[1], km: 50 }).features).toHaveLength(1);
  });
});

describe('enquadramento (para onde o mapa vai)', () => {
  it('com raio, enquadra o círculo do raio (mesmo com a sede do município)', () => {
    const raio = { lng: JOINVILLE[0], lat: JOINVILLE[1], km: 100 };
    expect(enquadramento(raio, JOINVILLE)).toEqual(limitesDoCirculo(circulo(JOINVILLE[0], JOINVILLE[1], 100)));
    expect(enquadramento(raio, null)).toEqual(limitesDoCirculo(circulo(JOINVILLE[0], JOINVILLE[1], 100)));
  });
  it('só o município: um círculo de RAIO_MUNICIPIO_KM em volta da sede (a cidade e os vizinhos)', () => {
    expect(RAIO_MUNICIPIO_KM).toBeGreaterThanOrEqual(15);
    expect(RAIO_MUNICIPIO_KM).toBeLessThanOrEqual(40);
    const [[oeste, sul], [leste, norte]] = enquadramento(null, JOINVILLE)!;
    expect(norte - sul).toBeCloseTo((2 * RAIO_MUNICIPIO_KM) / 111.195, 3);
    expect(oeste).toBeLessThan(JOINVILLE[0]);
    expect(leste).toBeGreaterThan(JOINVILLE[0]);
    expect(sul).toBeLessThan(JOINVILLE[1]);
    expect(norte).toBeGreaterThan(JOINVILLE[1]);
  });
  it('sem raio nem município: null (o mapa volta ao Brasil inteiro)', () => {
    expect(enquadramento(null, null)).toBeNull();
  });
  it('a caixa do Brasil cobre o país (oeste < leste, sul < norte)', () => {
    const [[oeste, sul], [leste, norte]] = BRASIL;
    expect(oeste).toBeLessThan(leste);
    expect(sul).toBeLessThan(norte);
    expect(oeste).toBeLessThan(JOINVILLE[0]);
    expect(leste).toBeGreaterThan(JOINVILLE[0]);
  });
});
