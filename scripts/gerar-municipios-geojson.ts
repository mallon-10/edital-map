// Gera public/geo/municipios.json (pontos cinza do mapa) a partir de data/municipios.csv.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { lerMunicipiosCsv, validarMunicipios } from '../worker/municipios';

const municipios = lerMunicipiosCsv(await readFile('data/municipios.csv', 'utf8'));
validarMunicipios(municipios);
const geo = {
  type: 'FeatureCollection',
  features: municipios.map((m) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [Number(m.lng.toFixed(4)), Number(m.lat.toFixed(4))] },
    properties: {},
  })),
};
await mkdir('public/geo', { recursive: true });
await writeFile('public/geo/municipios.json', JSON.stringify(geo));
console.log(`public/geo/municipios.json: ${geo.features.length} municípios`);
