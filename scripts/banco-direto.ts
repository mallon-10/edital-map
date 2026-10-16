import pg from 'pg';
import { lerUrlBanco } from './migracao';

/** Cliente (ainda sem conectar) para o Postgres do Supabase via SUPABASE_DB_URL. Nunca imprime a URI. */
export function conectarBanco(env: Record<string, string | undefined>): pg.Client {
  const url = new URL(lerUrlBanco(env));
  url.searchParams.delete('sslmode');
  // O Supabase assina com CA própria (fora do repositório do sistema): conexão cifrada, sem verificar a cadeia.
  return new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
}
