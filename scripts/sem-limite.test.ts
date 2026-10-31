import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Decisão de 19/10/2026: o grátis não tem limite por dia. Desde 31/10/2026, a pesquisa com termo mostra 5 editais (lib/limiteBusca.ts).
const RAIZ = fileURLToPath(new URL('..', import.meta.url));

function codigo(pasta: string): { arquivo: string; texto: string }[] {
  return (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[])
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => ({ arquivo: join(pasta, f), texto: readFileSync(join(RAIZ, pasta, f), 'utf8') }));
}

const SITE = [...codigo('app'), ...codigo('components'), ...codigo('lib'), { arquivo: 'proxy.ts', texto: readFileSync(join(RAIZ, 'proxy.ts'), 'utf8') }];

function achados(padrao: RegExp): string[] {
  return SITE.filter((a) => padrao.test(a.texto)).map((a) => a.arquivo);
}

describe('grátis sem limite e sem cadeado', () => {
  it('nenhum código bloqueia ou conta o uso do dia', () => {
    expect(achados(/limite_diario|registrar_uso|uso_do_dia|LIMITES_PLANO|decidirBusca|decidirEdital|\/api\/uso\b/)).toEqual([]);
  });
  it('nenhum 402 de recurso Pro (raio, órgão, exportar, link oficial, parecidos)', () => {
    expect(achados(/recurso_pro|semRecursoPro|cadeadoPro|precisaPro/)).toEqual([]);
  });
  it('sem a faixa do plano grátis nem o cartão do limite', () => {
    expect(achados(/FaixaPlano|CartaoLimite|LinkPro|EtiquetaPro/)).toEqual([]);
  });
  it('nenhum texto de limite diário na interface', () => {
    expect(achados(/Renova à 0h|[Bb]uscas por dia|3 buscas|3 editais|editais grátis de hoje|Volta amanhã/)).toEqual([]);
  });
});

describe('medição', () => {
  it('a conversão "limite" não dispara mais', () => {
    expect(achados(/conversao="limite"|medir\('limite'/)).toEqual([]);
  });
  it('buscou, checkout e assinou continuam', () => {
    expect(achados(/medir\('buscou'|conversao="buscou"/).length).toBeGreaterThan(0);
    expect(achados(/medir\('checkout'/).length).toBeGreaterThan(0);
    expect(achados(/conversao="assinou"/).length).toBeGreaterThan(0);
  });
});
