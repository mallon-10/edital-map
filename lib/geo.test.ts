import { describe, expect, it } from 'vitest';
import { areaDoRaio, BRASIL, circulo, distanciaKm, focoDoMapa, limitesDoCirculo, paraGeoJSON, RAIO_MUNICIPIO_KM, ZOOM_SEM_GRUPOS, type Limites } from './geo';

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

// Sedes nos extremos do país: Cruzeiro do Sul/AC (oeste), Chuí/RS (sul), Uiramutã/RR (norte), João Pessoa/PB (leste).
const EXTREMOS: [number, number][] = [[-72.67, -7.63], [-53.46, -33.69], [-60.17, 4.6], [-34.86, -7.12]];
const RAIO_JOINVILLE = { lng: JOINVILLE[0], lat: JOINVILLE[1], km: 100 };
const sem = () => null;

describe('BRASIL (enquadramento da abertura e da volta)', () => {
  it('contém as sedes dos extremos do país', () => {
    const [[oeste, sul], [leste, norte]] = BRASIL;
    for (const [lng, lat] of EXTREMOS) {
      expect(lng).toBeGreaterThan(oeste);
      expect(lng).toBeLessThan(leste);
      expect(lat).toBeGreaterThan(sul);
      expect(lat).toBeLessThan(norte);
    }
  });
});

describe('focoDoMapa (para onde o mapa vai)', () => {
  it('com raio, enquadra o círculo do raio — vence a sede, com ou sem foco anterior', () => {
    const limites = limitesDoCirculo(circulo(JOINVILLE[0], JOINVILLE[1], 100));
    for (const focado of [false, true]) {
      expect(focoDoMapa({ raio: RAIO_JOINVILLE, sede: JOINVILLE, focado, animar: true }, () => 12)).toEqual({ tipo: 'enquadrar', limites, duracao: 600 });
    }
  });
  it('só o município: voa até a sede com o zoom do círculo de RAIO_MUNICIPIO_KM', () => {
    let pedido: Limites | null = null;
    const d = focoDoMapa({ raio: null, sede: JOINVILLE, focado: false, animar: true }, (l) => {
      pedido = l;
      return 9.8;
    });
    expect(d).toEqual({ tipo: 'voar', centro: JOINVILLE, zoom: 9.8, duracao: 600 });
    expect(pedido).toEqual(limitesDoCirculo(circulo(JOINVILLE[0], JOINVILLE[1], RAIO_MUNICIPIO_KM)));
  });
  it('só o município: o zoom nunca fica abaixo de ZOOM_SEM_GRUPOS (a cidade não some num grupo)', () => {
    expect(ZOOM_SEM_GRUPOS).toBe(9);
    expect(focoDoMapa({ raio: null, sede: JOINVILLE, focado: false, animar: true }, () => 8.7)).toMatchObject({ tipo: 'voar', zoom: ZOOM_SEM_GRUPOS });
    expect(focoDoMapa({ raio: null, sede: JOINVILLE, focado: false, animar: true }, sem)).toMatchObject({ tipo: 'voar', zoom: ZOOM_SEM_GRUPOS });
  });
  it('sem raio nem município, ainda no Brasil da abertura: nada a fazer', () => {
    expect(focoDoMapa({ raio: null, sede: null, focado: false, animar: true }, sem)).toEqual({ tipo: 'nada' });
    expect(focoDoMapa({ raio: null, sede: null, focado: false, animar: false }, sem)).toEqual({ tipo: 'nada' });
  });
  it('tirou o filtro (estava focado): volta ao Brasil', () => {
    expect(focoDoMapa({ raio: null, sede: null, focado: true, animar: true }, sem)).toEqual({ tipo: 'brasil', limites: BRASIL, duracao: 600 });
  });
  it('tirou o raio e ficou o município: voa até a sede', () => {
    expect(focoDoMapa({ raio: null, sede: JOINVILLE, focado: true, animar: true }, () => 10)).toEqual({ tipo: 'voar', centro: JOINVILLE, zoom: 10, duracao: 600 });
  });
  it('foco da abertura (link direto, volta do edital): sem animação', () => {
    expect(focoDoMapa({ raio: null, sede: JOINVILLE, focado: false, animar: false }, () => 10)).toMatchObject({ duracao: 0 });
    expect(focoDoMapa({ raio: RAIO_JOINVILLE, sede: JOINVILLE, focado: false, animar: false }, sem)).toMatchObject({ tipo: 'enquadrar', duracao: 0 });
  });
});
