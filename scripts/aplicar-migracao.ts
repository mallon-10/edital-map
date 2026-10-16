// Uso: npm run db:aplicar -- supabase/migrations/0004_visual.sql
// Lê SUPABASE_DB_URL do .env (URI do Session pooler). Nunca imprime a URI.
import { readFile } from 'node:fs/promises';
import '../worker/ambiente';
import { conectarBanco } from './banco-direto';
import { aplicarMigracao, nomeDaMigracao, versaoDe } from './migracao';

const caminho = process.argv[2];
if (!caminho) throw new Error('Informe o arquivo: npm run db:aplicar -- supabase/migrations/NNNN_nome.sql');

const nome = nomeDaMigracao(caminho);
const sql = await readFile(caminho, 'utf8');
const cliente = conectarBanco(process.env);
await cliente.connect();
try {
  const r = await aplicarMigracao(cliente, { nome, sql, versao: versaoDe(new Date()) });
  console.log(r === 'aplicada' ? `[migração] ${nome} aplicada` : `[migração] ${nome} já estava aplicada; nada feito`);
} finally {
  await cliente.end();
}
