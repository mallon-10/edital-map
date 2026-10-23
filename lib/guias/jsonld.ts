import type { Guia, Termo } from '../../conteudo/tipos';
import { url } from '../seo/site';
import { jsonLdMigalhas } from '../seo/textos';

/** Texto sem a marcação de link (`[rótulo](endereço)` → rótulo), para os dados estruturados. */
export function semMarcacao(texto: string): string {
  return texto.replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1');
}

const ORGANIZACAO = { '@id': url('/#organizacao') };

export const migalhasDoGuia = (g: Guia) => [
  { nome: 'Início', caminho: '/' },
  { nome: 'Guias', caminho: '/guias' },
  { nome: g.titulo, caminho: `/guias/${g.slug}` },
];

export const migalhasDoTermo = (t: Termo) => [
  { nome: 'Início', caminho: '/' },
  { nome: 'Glossário', caminho: '/glossario' },
  { nome: t.nome, caminho: `/glossario/${t.slug}` },
];

/** Article, FAQPage e BreadcrumbList do guia (a organização é a da página inicial, lib/seo/marca.ts). */
export function jsonLdGuia(g: Guia): object {
  const artigo = {
    '@type': 'Article',
    headline: g.titulo,
    description: g.descricao,
    inLanguage: 'pt-BR',
    datePublished: g.revisadoEm,
    dateModified: g.revisadoEm,
    mainEntityOfPage: url(`/guias/${g.slug}`),
    author: ORGANIZACAO,
    publisher: ORGANIZACAO,
  };
  const perguntas = {
    '@type': 'FAQPage',
    mainEntity: g.perguntas.map((p) => ({
      '@type': 'Question',
      name: semMarcacao(p.pergunta),
      acceptedAnswer: { '@type': 'Answer', text: semMarcacao(p.resposta) },
    })),
  };
  const { '@context': _c, ...migalhas } = jsonLdMigalhas(migalhasDoGuia(g)) as Record<string, unknown>;
  return { '@context': 'https://schema.org', '@graph': [artigo, perguntas, migalhas] };
}

export function jsonLdTermo(t: Termo): object {
  const termo = {
    '@type': 'DefinedTerm',
    name: t.nome,
    description: semMarcacao(t.definicao),
    url: url(`/glossario/${t.slug}`),
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Glossário de licitações', url: url('/glossario') },
  };
  const { '@context': _c, ...migalhas } = jsonLdMigalhas(migalhasDoTermo(t)) as Record<string, unknown>;
  return { '@context': 'https://schema.org', '@graph': [termo, migalhas] };
}
