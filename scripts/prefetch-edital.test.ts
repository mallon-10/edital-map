import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

function arquivosTsx(pasta: string): string[] {
  return (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[]).filter((f) => f.endsWith('.tsx')).map((f) => join(pasta, f));
}

/** Aberturas de `<Link ...>` até o `>` que fecha a tag fora de chaves (o `>` de `() => x` dentro de `{}` não fecha). */
function aberturasDeLink(texto: string): string[] {
  const achadas: string[] = [];
  const inicio = /<Link[\s>]/g;
  for (let m = inicio.exec(texto); m; m = inicio.exec(texto)) {
    let profundidade = 0;
    let fim = m.index + 5;
    for (; fim < texto.length; fim++) {
      const c = texto[fim];
      if (c === '{') profundidade++;
      else if (c === '}') profundidade--;
      else if (c === '>' && profundidade === 0) break;
    }
    achadas.push(texto.slice(m.index, fim + 1));
  }
  return achadas;
}

describe('links para /edital sem prefetch (abrir edital é sob demanda: evita carga no PNCP e no banco)', () => {
  it('o achador enxerga a tag inteira, mesmo com setas dentro de chaves, e ignora outros componentes', () => {
    expect(aberturasDeLink('<Link href={`/edital/${x}`} onClick={() => f()} prefetch={false}>t</Link>')).toEqual([
      '<Link href={`/edital/${x}`} onClick={() => f()} prefetch={false}>',
    ]);
    expect(aberturasDeLink('<LinkRelacionado href="/edital/x">')).toEqual([]);
  });
  it('todo <Link> com href para /edital/ tem prefetch={false}', () => {
    const faltando: string[] = [];
    for (const arquivo of [...arquivosTsx('app'), ...arquivosTsx('components')]) {
      for (const a of aberturasDeLink(readFileSync(join(RAIZ, arquivo), 'utf8'))) {
        if (a.includes('/edital/') && !a.includes('prefetch={false}')) faltando.push(`${arquivo}: ${a.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    expect(faltando).toEqual([]);
  });
  it('todo <Link> para a página inicial com busca (/?…) tem prefetch={false} (abrir consulta o banco)', () => {
    const faltando: string[] = [];
    for (const arquivo of [...arquivosTsx('app'), ...arquivosTsx('components')]) {
      for (const a of aberturasDeLink(readFileSync(join(RAIZ, arquivo), 'utf8'))) {
        if (/href=\{?[`"']\/\?/.test(a) && !a.includes('prefetch={false}')) faltando.push(`${arquivo}: ${a.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    expect(faltando).toEqual([]);
  });
  it('todo <Link> para /radar (páginas da conta, dinâmicas) tem prefetch={false}', () => {
    const faltando: string[] = [];
    for (const arquivo of [...arquivosTsx('app'), ...arquivosTsx('components')]) {
      for (const a of aberturasDeLink(readFileSync(join(RAIZ, arquivo), 'utf8'))) {
        if (/href=\{?[`"']\/radar/.test(a) && !a.includes('prefetch={false}')) faltando.push(`${arquivo}: ${a.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    expect(faltando).toEqual([]);
  });
  it('a página do edital não ganha loading.tsx nem Cache Components (o Next passaria a pré-carregar e contar)', () => {
    expect(existsSync(join(RAIZ, 'app', 'edital', '[slug]', 'loading.tsx'))).toBe(false);
    expect(readFileSync(join(RAIZ, 'next.config.ts'), 'utf8')).not.toContain('cacheComponents');
  });
});
