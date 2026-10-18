import { describe, expect, it } from 'vitest';
import { assuntoPorSlug } from './assuntos';
import { arquivosDoSitemap, loteDoArquivo, paginasFixas, POR_ARQUIVO, xmlIndice, xmlUrls } from './sitemap';

describe('arquivos do sitemap', () => {
  it('um arquivo de páginas e um por 40 mil editais', () => {
    expect(POR_ARQUIVO).toBe(40_000);
    expect(arquivosDoSitemap(0)).toEqual(['paginas.xml']);
    expect(arquivosDoSitemap(1)).toEqual(['paginas.xml', 'editais-1.xml']);
    expect(arquivosDoSitemap(40_000)).toEqual(['paginas.xml', 'editais-1.xml']);
    expect(arquivosDoSitemap(40_001)).toEqual(['paginas.xml', 'editais-1.xml', 'editais-2.xml']);
  });
  it('lote de cada arquivo de editais; nome fora do padrão = null', () => {
    expect(loteDoArquivo('editais-1.xml')).toBe(1);
    expect(loteDoArquivo('editais-12.xml')).toBe(12);
    expect(loteDoArquivo('editais-0.xml')).toBeNull();
    expect(loteDoArquivo('editais-1')).toBeNull();
    expect(loteDoArquivo('paginas.xml')).toBeNull();
    expect(loteDoArquivo('editais-1.xml.bak')).toBeNull();
  });
});

describe('paginasFixas', () => {
  it('só entra o que tem edital aberto; o índice /licitacoes sempre', () => {
    const epi = assuntoPorSlug('epi')!;
    const caminhos = paginasFixas([
      { assunto: null, porUf: { SP: 900, RR: 0 } },
      { assunto: epi, porUf: { SP: 12 } },
      { assunto: assuntoPorSlug('combustiveis')!, porUf: {} },
    ]);
    expect(caminhos).toEqual(['/licitacoes', '/licitacoes/sp', '/licitacoes/epi', '/licitacoes/epi/sp']);
  });
});

describe('XML', () => {
  it('índice com os arquivos', () => {
    expect(xmlIndice(['https://x.br/sitemaps/paginas.xml'])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        '<sitemap><loc>https://x.br/sitemaps/paginas.xml</loc></sitemap>\n</sitemapindex>\n',
    );
  });
  it('urls com data opcional e caracteres escapados', () => {
    expect(xmlUrls([{ url: 'https://x.br/a?b=1&c=2' }, { url: 'https://x.br/e', lastModified: '2026-10-18T10:00:00.000Z' }])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        '<url><loc>https://x.br/a?b=1&amp;c=2</loc></url>\n' +
        '<url><loc>https://x.br/e</loc><lastmod>2026-10-18T10:00:00.000Z</lastmod></url>\n</urlset>\n',
    );
  });
});
