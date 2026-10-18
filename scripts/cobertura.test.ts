import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');
const arquivosTsx = (pasta: string) =>
  (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[]).filter((f) => f.endsWith('.tsx')).map((f) => join(pasta, f));

describe('cobertura honesta (spec §1)', () => {
  it('ninguém promete todas as licitações do Brasil', () => {
    for (const f of [...arquivosTsx('app'), ...arquivosTsx('components')]) expect(ler(f), f).not.toMatch(/todas as licita/i);
  });
  it('rodapé da lista, faixa do edital e /sobre mostram a fonte e as modalidades', () => {
    for (const f of ['components/inicio/ColunaLista.tsx', 'components/FaixaCobertura.tsx', 'app/sobre/page.tsx']) {
      expect(ler(f), f).toContain('{FONTE_COBERTURA}');
    }
  });
});
