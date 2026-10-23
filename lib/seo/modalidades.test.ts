import { describe, expect, it } from 'vitest';
import { ASSUNTOS, resolverSegmento, SEGMENTO_ORGAO } from './assuntos';
import { SLUGS_GUIAS, SLUGS_TERMOS } from '../../conteudo/slugs';
import { MODALIDADES, modalidadePorNome, modalidadePorSlug } from './modalidades';

describe('MODALIDADES', () => {
  it('as cinco modalidades da v1, com o id do PNCP', () => {
    expect(MODALIDADES.map((m) => [m.slug, m.id])).toEqual([
      ['pregao-eletronico', 6],
      ['pregao-presencial', 7],
      ['concorrencia', 4],
      ['dispensa', 8],
      ['credenciamento', 12],
    ]);
  });
  it('explicação cita a lei e termina mandando conferir o edital', () => {
    for (const m of MODALIDADES) {
      expect(m.explicacao).toContain('14.133');
      expect(m.explicacao.endsWith('Confira sempre as regras no edital.')).toBe(true);
    }
  });
  it('"Entenda como funciona" leva a um guia ou termo que existe', () => {
    const existentes = new Set([...SLUGS_GUIAS.map((g) => `/guias/${g}`), ...SLUGS_TERMOS.map((t) => `/glossario/${t}`)]);
    for (const m of MODALIDADES) expect(existentes.has(m.saibaMais), m.slug).toBe(true);
  });
  it('acha pelo slug e pelo nome do PNCP', () => {
    expect(modalidadePorSlug('dispensa')?.id).toBe(8);
    expect(modalidadePorSlug('pregao')).toBeNull();
    expect(modalidadePorNome('Pregão - Eletrônico')?.slug).toBe('pregao-eletronico');
    expect(modalidadePorNome('Pregão - Presencial')?.slug).toBe('pregao-presencial');
    expect(modalidadePorNome('Concorrência - Eletrônica')?.slug).toBe('concorrencia');
    expect(modalidadePorNome('Concorrência - Presencial')?.slug).toBe('concorrencia');
    expect(modalidadePorNome('Dispensa')?.slug).toBe('dispensa');
    expect(modalidadePorNome('Credenciamento')?.slug).toBe('credenciamento');
    expect(modalidadePorNome('Leilão - Eletrônico')).toBeNull();
    expect(modalidadePorNome(null)).toBeNull();
  });
});

describe('segmentos de /licitacoes', () => {
  it('nenhum slug repetido entre assuntos, modalidades e órgão; nenhum com 2 letras (UF)', () => {
    const slugs = [...ASSUNTOS.map((a) => a.slug), ...MODALIDADES.map((m) => m.slug), SEGMENTO_ORGAO];
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s.length).toBeGreaterThan(2);
  });
  it('resolve modalidade; "orgao" não é segmento de [x]', () => {
    expect(resolverSegmento('pregao-eletronico')).toEqual({ tipo: 'modalidade', modalidade: modalidadePorSlug('pregao-eletronico') });
    expect(resolverSegmento(SEGMENTO_ORGAO)).toBeNull();
  });
});
