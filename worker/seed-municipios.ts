import './ambiente';
import { readFile } from 'node:fs/promises';
import { criarBanco, criarSupabase } from './banco';
import { lerSupabase } from './config';
import { lerMunicipiosCsv, validarMunicipios } from './municipios';

const municipios = lerMunicipiosCsv(await readFile('data/municipios.csv', 'utf8'));
validarMunicipios(municipios);

const { url, chave } = lerSupabase();
const sb = criarSupabase(url, chave);
await criarBanco(sb).upsertMunicipios(municipios);

const { count, error } = await sb.from('municipios').select('codigo_ibge', { count: 'exact', head: true });
if (error) throw new Error(`contar municipios: ${error.message}`);
console.log(`Municípios enviados: ${municipios.length}. No banco agora: ${count}.`);
