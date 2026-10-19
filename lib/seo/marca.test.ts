import { describe, expect, it } from 'vitest';
import { ASSUNTOS } from './assuntos';
import { jsonLdMarca, jsonLdPerguntas, linksDaInicio, LINKS_RODAPE, NOMES_ALTERNATIVOS, PERGUNTAS_LICITACOES } from './marca';

describe('jsonLdMarca', () => {
  it('declara o site e a empresa com o nome alternativo "EditalMap" e o logo', () => {
    const j = jsonLdMarca() as { '@graph': Array<Record<string, unknown>> };
    const site = j['@graph'].find((n) => n['@type'] === 'WebSite')!;
    const org = j['@graph'].find((n) => n['@type'] === 'Organization')!;
    expect(site).toMatchObject({ name: 'Edital Map', url: 'https://www.editalmap.com.br/', inLanguage: 'pt-BR' });
    expect(site.alternateName).toEqual(NOMES_ALTERNATIVOS);
    expect(NOMES_ALTERNATIVOS).toContain('EditalMap');
    expect(org).toMatchObject({ name: 'Edital Map', url: 'https://www.editalmap.com.br/', logo: 'https://www.editalmap.com.br/logo.png' });
    expect(site.publisher).toEqual({ '@id': org['@id'] });
  });

  it('sem perfis, não escreve sameAs; com perfis, escreve', () => {
    const org = (j: object) => (j as { '@graph': Array<Record<string, unknown>> })['@graph'].find((n) => n['@type'] === 'Organization')!;
    expect(org(jsonLdMarca())).not.toHaveProperty('sameAs');
    expect(org(jsonLdMarca(['https://www.linkedin.com/company/x'])).sameAs).toEqual(['https://www.linkedin.com/company/x']);
  });
});

describe('perguntas de /licitacoes', () => {
  it('têm pergunta e resposta e viram FAQPage', () => {
    expect(PERGUNTAS_LICITACOES.length).toBeGreaterThanOrEqual(4);
    for (const p of PERGUNTAS_LICITACOES) {
      expect(p.pergunta.endsWith('?')).toBe(true);
      expect(p.resposta.length).toBeGreaterThan(60);
    }
    const j = jsonLdPerguntas(PERGUNTAS_LICITACOES) as { '@type': string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
    expect(j['@type']).toBe('FAQPage');
    expect(j.mainEntity[0]).toMatchObject({ name: PERGUNTAS_LICITACOES[0].pergunta, acceptedAnswer: { text: PERGUNTAS_LICITACOES[0].resposta } });
  });
});

describe('linksDaInicio', () => {
  const cidades = [
    { ibge: '1', nome: 'Salvador', uf: 'BA', slug: 'salvador', total: 300 },
    { ibge: '2', nome: 'Feira de Santana', uf: 'BA', slug: 'feira-de-santana', total: 40 },
    { ibge: '3', nome: 'São Paulo', uf: 'SP', slug: 'sao-paulo', total: 900 },
  ];

  it('traz todos os assuntos, as 27 UFs em ordem de nome e as cidades com mais editais primeiro', () => {
    const l = linksDaInicio(cidades, 2);
    expect(l.assuntos).toHaveLength(ASSUNTOS.length);
    expect(l.assuntos[0].caminho).toBe(`/licitacoes/${ASSUNTOS[0].slug}`);
    expect(l.estados).toHaveLength(27);
    expect(l.estados[0]).toEqual({ nome: 'Acre', caminho: '/licitacoes/ac' });
    expect(l.cidades).toEqual([
      { nome: 'São Paulo (SP)', caminho: '/licitacoes/sp/sao-paulo' },
      { nome: 'Salvador (BA)', caminho: '/licitacoes/ba/salvador' },
    ]);
  });
});

describe('LINKS_RODAPE', () => {
  it('leva às páginas de licitações, ao CNPJ, aos planos e ao sobre', () => {
    const caminhos = LINKS_RODAPE.map((l) => l.caminho);
    expect(caminhos).toEqual(expect.arrayContaining(['/licitacoes', '/cnpj', '/planos', '/sobre']));
  });
});
