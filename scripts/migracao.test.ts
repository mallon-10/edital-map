import { describe, expect, it } from 'vitest';
import { aplicarMigracao, lerUrlBanco, nomeDaMigracao, versaoDe, type ClienteSql } from './migracao';

const URL_OK = 'postgresql://postgres.ref:segredo-123@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

describe('nomeDaMigracao', () => {
  it('tira o número e a extensão, como o histórico do Supabase guarda', () => {
    expect(nomeDaMigracao('supabase/migrations/0004_visual.sql')).toBe('visual');
    expect(nomeDaMigracao('supabase\\migrations\\0002_disparo_sync.sql')).toBe('disparo_sync');
  });

  it('recusa arquivo fora do padrão NNNN_nome.sql', () => {
    expect(() => nomeDaMigracao('supabase/migrations/visual.sql')).toThrow(/NNNN_nome\.sql/);
    expect(() => nomeDaMigracao('docs/fase-2-portao.sql')).toThrow(/NNNN_nome\.sql/);
  });
});

describe('versaoDe', () => {
  it('usa data e hora UTC no formato AAAAMMDDHHMMSS', () => {
    expect(versaoDe(new Date('2026-10-16T09:05:07Z'))).toBe('20261016090507');
  });
});

describe('lerUrlBanco', () => {
  it('devolve SUPABASE_DB_URL quando é uma URI do Postgres', () => {
    expect(lerUrlBanco({ SUPABASE_DB_URL: URL_OK })).toBe(URL_OK);
    expect(lerUrlBanco({ SUPABASE_DB_URL: `  ${URL_OK.replace('postgresql', 'postgres')}  ` })).toBe(
      URL_OK.replace('postgresql', 'postgres'),
    );
  });

  it('explica o que falta quando a variável não existe', () => {
    expect(() => lerUrlBanco({})).toThrow(/SUPABASE_DB_URL.*Session pooler/);
  });

  it('recusa valor que não é URI do Postgres sem mostrar o valor', () => {
    let mensagem = '';
    try {
      lerUrlBanco({ SUPABASE_DB_URL: 'segredo-123' });
    } catch (e) {
      mensagem = (e as Error).message;
    }
    expect(mensagem).toMatch(/postgresql:\/\//);
    expect(mensagem).not.toContain('segredo-123');
  });

  it('recusa URI sem senha', () => {
    expect(() => lerUrlBanco({ SUPABASE_DB_URL: 'postgresql://postgres.ref@host:5432/postgres' })).toThrow(/senha/);
  });

  it('recusa URI com o marcador [YOUR-PASSWORD] do painel', () => {
    expect(() =>
      lerUrlBanco({ SUPABASE_DB_URL: 'postgresql://postgres.ref:[YOUR-PASSWORD]@host:5432/postgres' }),
    ).toThrow(/senha/);
  });
});

class ClienteFalso implements ClienteSql {
  chamadas: { texto: string; valores?: unknown[] }[] = [];
  jaAplicada = false;
  falharNo: string | null = null;

  async query(texto: string, valores?: unknown[]) {
    this.chamadas.push({ texto, valores });
    if (this.falharNo && texto.includes(this.falharNo)) throw new Error('erro no banco');
    if (texto.includes('from supabase_migrations.schema_migrations')) {
      return { rows: this.jaAplicada ? [{ version: '20261015185229' }] : [] };
    }
    return { rows: [] };
  }

  textos() {
    return this.chamadas.map((c) => c.texto.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase());
  }
}

describe('aplicarMigracao', () => {
  const migracao = { nome: 'visual', sql: 'alter table x add column y int;', versao: '20261016090507' };

  it('roda o arquivo e grava o histórico na mesma transação', async () => {
    const c = new ClienteFalso();
    await expect(aplicarMigracao(c, migracao)).resolves.toBe('aplicada');
    expect(c.textos()).toEqual(['begin', 'select version', 'alter table', 'insert into', 'commit']);
    const insercao = c.chamadas[3];
    expect(insercao.texto).toContain('supabase_migrations.schema_migrations');
    expect(insercao.valores).toEqual(['20261016090507', 'visual', ['alter table x add column y int;']]);
  });

  it('não roda de novo uma migração já registrada', async () => {
    const c = new ClienteFalso();
    c.jaAplicada = true;
    await expect(aplicarMigracao(c, migracao)).resolves.toBe('ja-aplicada');
    expect(c.textos()).toEqual(['begin', 'select version', 'rollback']);
  });

  it('desfaz tudo quando o arquivo falha', async () => {
    const c = new ClienteFalso();
    c.falharNo = 'alter table';
    await expect(aplicarMigracao(c, migracao)).rejects.toThrow('erro no banco');
    expect(c.textos()).toEqual(['begin', 'select version', 'alter table', 'rollback']);
  });
});
