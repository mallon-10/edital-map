import { describe, expect, it } from 'vitest';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { ajustarEstilo, carregarEstilo, estiloReserva, ID_DIVISAS, linhasDica, NOME_PT, pilula, URL_ESTILO } from './mapaRotulos';

const cidade = { ibge: '3550308', nome: 'São Paulo', uf: 'SP', qtd: 1443, valor: 40_000_000, destaque: 0 };
const grupo = { cluster: true, cluster_id: 7, qtd: 12345, valor: 2_100_000_000, destaque: 1 };

describe('pilula', () => {
  it('cidade: número, rótulo com cidade/UF e chave pelo IBGE', () => {
    expect(pilula(cidade)).toEqual({ chave: 'c3550308', texto: '1.443', rotulo: 'São Paulo/SP: 1.443 editais abertos', grupo: false, destaque: false });
  });
  it('grupo: número curto, rótulo que convida a aproximar e chave pelo cluster', () => {
    expect(pilula(grupo)).toEqual({ chave: 'g7', texto: '12 mil', rotulo: '12.345 editais abertos nesta região. Aproximar', grupo: true, destaque: true });
  });
  it('singular', () => {
    expect(pilula({ ...cidade, qtd: 1 }).rotulo).toBe('São Paulo/SP: 1 edital aberto');
  });
});

describe('linhasDica', () => {
  it('cidade: nome, quantidade e valor', () => {
    expect(linhasDica(cidade)).toEqual(['São Paulo/SP', '1.443 editais abertos', 'R$ 40,00 mi']);
  });
  it('grupo: quantidade, valor e convite para aproximar', () => {
    expect(linhasDica(grupo)).toEqual(['12.345 editais abertos', 'R$ 2,1 bi', 'Aproxime para ver as cidades']);
  });
  it('sem valor: a linha do valor some', () => {
    expect(linhasDica({ ...cidade, valor: 0 })).toEqual(['São Paulo/SP', '1.443 editais abertos']);
  });
});

const ESTILO: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f2f3f0' } },
    { id: 'boundary_3', type: 'line', source: 'openmaptiles', 'source-layer': 'boundary' },
    { id: 'label_city', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']] } },
    { id: 'label_state', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']] } },
  ],
};
const ids = (ls: LayerSpecification[]) => ls.map((l) => l.id);

describe('ajustarEstilo', () => {
  it('rótulos em português', () => {
    const e = ajustarEstilo(ESTILO);
    const cidadeLayer = e.layers.find((l) => l.id === 'label_city');
    expect(cidadeLayer?.type === 'symbol' && cidadeLayer.layout?.['text-field']).toEqual(NOME_PT);
  });
  it('esconde o nome de estado do fundo (os nossos entram por cima)', () => {
    const e = ajustarEstilo(ESTILO);
    const estado = e.layers.find((l) => l.id === 'label_state');
    expect(estado?.type === 'symbol' && estado.layout?.visibility).toBe('none');
  });
  it('põe as divisas logo depois das fronteiras do fundo', () => {
    expect(ids(ajustarEstilo(ESTILO).layers)).toEqual(['background', 'boundary_3', ID_DIVISAS, 'label_city', 'label_state']);
  });
  it('sem boundary_3: divisas antes do primeiro rótulo', () => {
    const semFronteira = { ...ESTILO, layers: ESTILO.layers.filter((l) => l.id !== 'boundary_3') };
    expect(ids(ajustarEstilo(semFronteira).layers)).toEqual(['background', ID_DIVISAS, 'label_city', 'label_state']);
  });
  it('placa de rodovia (ref, não nome) fica como veio', () => {
    const placa: LayerSpecification = {
      id: 'highway-shield-non-us', type: 'symbol', source: 'openmaptiles', 'source-layer': 'transportation_name',
      layout: { 'text-field': ['to-string', ['get', 'ref']] },
    };
    const e = ajustarEstilo({ ...ESTILO, layers: [...ESTILO.layers, placa] });
    expect(e.layers.find((l) => l.id === 'highway-shield-non-us')).toEqual(placa);
  });
  it('não altera o estilo recebido', () => {
    const copia = JSON.parse(JSON.stringify(ESTILO));
    ajustarEstilo(ESTILO);
    expect(ESTILO).toEqual(copia);
  });
});

describe('estiloReserva', () => {
  it('fundo branco e contornos do nosso arquivo, sem fontes externas', () => {
    const e = estiloReserva();
    expect(e.glyphs).toBeUndefined();
    expect(e.sources.estados).toEqual({ type: 'geojson', data: '/geo/estados.json' });
    expect(ids(e.layers)).toEqual(['fundo', ID_DIVISAS]);
  });
});

describe('carregarEstilo', () => {
  it('estilo do OpenFreeMap ajustado', async () => {
    let pedida = '';
    const buscar = (async (url: string) => {
      pedida = url;
      return new Response(JSON.stringify(ESTILO), { status: 200 });
    }) as unknown as typeof fetch;
    const e = await carregarEstilo(buscar);
    expect(pedida).toBe(URL_ESTILO);
    expect(ids(e.layers)).toContain(ID_DIVISAS);
    expect(e.glyphs).toBe(ESTILO.glyphs);
  });
  it('resposta de erro: reserva', async () => {
    const buscar = (async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    expect(await carregarEstilo(buscar)).toEqual(estiloReserva());
  });
  it('falha de rede ou tempo esgotado: reserva', async () => {
    const buscar = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await carregarEstilo(buscar)).toEqual(estiloReserva());
  });
});
