// Gera public/geo/estados.json (contorno das 27 UFs) a partir da malha do IBGE (qualidade mínima).
// O IBGE não envia o certificado intermediário (Sectigo); --use-system-ca usa o repositório de certificados do SO. A verificação continua ligada.
import { mkdir, writeFile } from 'node:fs/promises';
import { UF_POR_CODIGO } from '../worker/municipios';

const URL_MALHA =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF';
const CASAS = Number(process.env.CASAS ?? 3);

const resposta = await fetch(URL_MALHA);
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
const malha = (await resposta.json()) as { features: Array<{ geometry: { type: string; coordinates: unknown }; properties: { codarea: string } }> };

const fator = 10 ** CASAS;
const arredondar = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(arredondar) : typeof v === 'number' ? Math.round(v * fator) / fator : v;

const features = malha.features.map((f) => {
  const uf = UF_POR_CODIGO[f.properties.codarea];
  if (!uf) throw new Error(`Código de UF desconhecido: ${f.properties.codarea}`);
  return { type: 'Feature', properties: { uf }, geometry: { type: f.geometry.type, coordinates: arredondar(f.geometry.coordinates) } };
});
if (features.length !== 27) throw new Error(`Esperava 27 UFs, veio ${features.length}`);

const json = JSON.stringify({ type: 'FeatureCollection', features });
await mkdir('public/geo', { recursive: true });
await writeFile('public/geo/estados.json', json);
console.log(`public/geo/estados.json: ${features.length} UFs, ${Math.round(json.length / 1024)} KB`);
