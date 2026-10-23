import { describe, expect, it } from 'vitest';
import type { Guia, Termo } from '../../conteudo/tipos';
import { jsonLdGuia, jsonLdTermo, semMarcacao } from './jsonld';

const guia: Guia = {
  slug: 'sicaf', titulo: 'SICAF: o que é', descricao: 'Descrição.', resposta: 'O [SICAF](/glossario/sicaf) é o cadastro.', revisadoEm: '2026-10-23',
  secoes: [], editais: [], fontes: [], relacionados: [],
  perguntas: [{ pergunta: 'É grátis?', resposta: 'Sim, veja o [portal](https://www.gov.br/compras).' }],
};

describe('semMarcacao', () => {
  it('deixa só o rótulo dos links', () => {
    expect(semMarcacao('O [SICAF](/glossario/sicaf) e [x](https://exemplo.com).')).toBe('O SICAF e x.');
  });
});

describe('jsonLdGuia', () => {
  const ld = jsonLdGuia(guia) as { '@graph': Array<Record<string, unknown>> };
  const tipo = (t: string) => ld['@graph'].find((n) => n['@type'] === t)!;
  it('Article com data, autor e canônico', () => {
    expect(tipo('Article')).toMatchObject({
      headline: 'SICAF: o que é', dateModified: '2026-10-23', datePublished: '2026-10-23', inLanguage: 'pt-BR',
      mainEntityOfPage: 'https://www.editalmap.com.br/guias/sicaf', description: 'Descrição.',
      author: { '@id': 'https://www.editalmap.com.br/#organizacao' }, publisher: { '@id': 'https://www.editalmap.com.br/#organizacao' },
    });
  });
  it('FAQPage sem marcação e migalhas', () => {
    expect(tipo('FAQPage')).toMatchObject({
      mainEntity: [{ '@type': 'Question', name: 'É grátis?', acceptedAnswer: { '@type': 'Answer', text: 'Sim, veja o portal.' } }],
    });
    const m = tipo('BreadcrumbList') as { itemListElement: Array<{ item: string }> };
    expect(m.itemListElement.map((i) => i.item)).toEqual([
      'https://www.editalmap.com.br/', 'https://www.editalmap.com.br/guias', 'https://www.editalmap.com.br/guias/sicaf',
    ]);
  });
});

describe('jsonLdTermo', () => {
  const termo: Termo = { slug: 'edital', nome: 'Edital', definicao: 'Edital é o [documento](/glossario/edital).', relacionados: [] };
  it('DefinedTerm no conjunto do glossário', () => {
    const ld = jsonLdTermo(termo) as { '@graph': Array<Record<string, unknown>> };
    expect(ld['@graph'][0]).toMatchObject({
      '@type': 'DefinedTerm', name: 'Edital', description: 'Edital é o documento.', url: 'https://www.editalmap.com.br/glossario/edital',
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Glossário de licitações', url: 'https://www.editalmap.com.br/glossario' },
    });
    expect(ld['@graph'][1]['@type']).toBe('BreadcrumbList');
  });
});
