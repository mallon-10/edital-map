import { describe, expect, it } from 'vitest';
import { GUIAS, TERMOS } from '../../conteudo';
import { SLUGS_GUIAS, SLUGS_TERMOS } from '../../conteudo/slugs';
import { problemasDoGuia, problemasDoTermo } from './validar';

const ctx = { guias: new Set<string>(SLUGS_GUIAS), termos: new Set<string>(SLUGS_TERMOS), hoje: new Date().toISOString().slice(0, 10) };

describe('conteúdo publicado', () => {
  it('um guia para cada endereço de conteudo/slugs.ts, sem repetir', () => {
    expect(GUIAS.map((g) => g.slug).sort()).toEqual([...SLUGS_GUIAS].sort());
  });
  it('um termo para cada endereço de conteudo/slugs.ts, sem repetir', () => {
    expect(TERMOS.map((t) => t.slug).sort()).toEqual([...SLUGS_TERMOS].sort());
  });
  it.each(GUIAS.map((g) => [g.slug, g] as const))('guia %s segue as regras', (_s, g) => {
    expect(problemasDoGuia(g, ctx)).toEqual([]);
  });
  it.each(TERMOS.map((t) => [t.slug, t] as const))('termo %s segue as regras', (_s, t) => {
    expect(problemasDoTermo(t, ctx)).toEqual([]);
  });
  it('o guia pilar liga para todos os outros guias', () => {
    const pilar = GUIAS.find((g) => g.slug === 'como-participar-de-licitacao')!;
    const texto = JSON.stringify(pilar);
    for (const s of SLUGS_GUIAS) if (s !== pilar.slug) expect(texto, s).toContain(`/guias/${s}`);
  });
});
