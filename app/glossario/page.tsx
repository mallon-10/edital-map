import type { Metadata } from 'next';
import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { DadosEstruturados, Migalhas } from '@/components/guias/TextoComLinks';
import { TERMOS } from '@/conteudo';
import { semMarcacao } from '@/lib/guias/jsonld';
import { url } from '@/lib/seo/site';
import { jsonLdMigalhas } from '@/lib/seo/textos';
import { OPEN_GRAPH_BASE } from '@/lib/seo/site';

const TITULO = 'Glossário de licitações';
const DESCRICAO = 'Os termos das licitações explicados em linguagem simples: adjudicação, homologação, pregão, SICAF, empenho, ata de registro de preços e mais.';

export const metadata: Metadata = {
  title: { absolute: `${TITULO} · Edital Map` },
  description: DESCRICAO,
  alternates: { canonical: '/glossario' },
  openGraph: { ...OPEN_GRAPH_BASE, title: TITULO, description: DESCRICAO, url: '/glossario' },
};

const MIGALHAS = [{ nome: 'Início', caminho: '/' }, { nome: 'Glossário', caminho: '/glossario' }];

const letraDe = (nome: string) => nome.normalize('NFD').replace(/\p{M}/gu, '').charAt(0).toUpperCase();

/** Glossário de A a Z, com a definição curta de cada termo. */
export default function Glossario() {
  const porLetra = new Map<string, typeof TERMOS[number][]>();
  for (const t of TERMOS) porLetra.set(letraDe(t.nome), [...(porLetra.get(letraDe(t.nome)) ?? []), t]);
  const letras = [...porLetra.keys()];
  const conjunto = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: TITULO,
    url: url('/glossario'),
    hasDefinedTerm: TERMOS.map((t) => ({ '@type': 'DefinedTerm', name: t.nome, url: url(`/glossario/${t.slug}`) })),
  };
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-28 pt-6 text-ink md:px-6 lg:pb-12">
        <DadosEstruturados dados={jsonLdMigalhas(MIGALHAS)} />
        <DadosEstruturados dados={conjunto} />
        <Migalhas itens={MIGALHAS} />
        <header className="flex max-w-[72ch] flex-col gap-3">
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.015em] md:text-[36px]">{TITULO}</h1>
          <p className="text-[16px] text-ink-muted">
            {TERMOS.length} termos das compras públicas explicados para quem vende ao governo. Para o passo a passo, veja os{' '}
            <Link href="/guias" prefetch={false} className="font-semibold text-ink underline decoration-pin decoration-2 underline-offset-2">
              guias de licitação
            </Link>
            .
          </p>
        </header>
        <nav aria-label="Letras" className="flex flex-wrap gap-2">
          {letras.map((l) => (
            <a key={l} href={`#letra-${l}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-raised text-[14px] font-semibold hover:bg-sunken">
              {l}
            </a>
          ))}
        </nav>
        {letras.map((l) => (
          <section key={l} id={`letra-${l}`} aria-labelledby={`letra-${l}-t`} className="flex scroll-mt-24 flex-col gap-3">
            <h2 id={`letra-${l}-t`} className="text-[22px] font-bold text-pin-strong">
              {l}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {porLetra.get(l)!.map((t) => (
                <li key={t.slug}>
                  <Link href={`/glossario/${t.slug}`} prefetch={false} className="flex h-full flex-col gap-1 rounded-[22px] bg-raised p-5 hover:bg-sunken">
                    <span className="text-[17px] font-bold">{t.nome}</span>
                    <span className="text-[14px] text-ink-muted">{semMarcacao(t.definicao)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
