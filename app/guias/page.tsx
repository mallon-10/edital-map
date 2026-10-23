import type { Metadata } from 'next';
import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { DadosEstruturados, Migalhas } from '@/components/guias/TextoComLinks';
import { GUIAS } from '@/conteudo';
import { jsonLdMigalhas } from '@/lib/seo/textos';
import { OPEN_GRAPH_BASE } from '@/lib/seo/site';

const TITULO = 'Guias de licitação para empresas';
const DESCRICAO = 'Como participar de licitação, SICAF, pregão eletrônico, dispensa, documentos e empenho: guias com a Lei 14.133 e fontes oficiais.';

export const metadata: Metadata = {
  title: { absolute: `${TITULO} · Edital Map` },
  description: DESCRICAO,
  alternates: { canonical: '/guias' },
  openGraph: { ...OPEN_GRAPH_BASE, title: TITULO, description: DESCRICAO, url: '/guias' },
};

const MIGALHAS = [{ nome: 'Início', caminho: '/' }, { nome: 'Guias', caminho: '/guias' }];

/** Índice dos guias: o pilar em destaque e os outros em cartões. */
export default function Guias() {
  const [pilar, ...outros] = GUIAS;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-28 pt-6 text-ink md:px-6 lg:pb-12">
        <DadosEstruturados dados={jsonLdMigalhas(MIGALHAS)} />
        <Migalhas itens={MIGALHAS} />
        <header className="flex max-w-[72ch] flex-col gap-3">
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.015em] md:text-[36px]">{TITULO}</h1>
          <p className="text-[16px] text-ink-muted">
            O que sua empresa precisa saber para vender ao governo, em linguagem simples, com os artigos da Lei 14.133/2021 e links para as fontes
            oficiais. Para os termos técnicos, veja o{' '}
            <Link href="/glossario" prefetch={false} className="font-semibold text-ink underline decoration-pin decoration-2 underline-offset-2">
              glossário de licitações
            </Link>
            .
          </p>
        </header>
        <Link href={`/guias/${pilar.slug}`} prefetch={false} className="flex flex-col gap-2 rounded-[22px] bg-ink p-6 text-surface hover:opacity-95 lg:p-8">
          <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pin">Comece por aqui</span>
          <span className="text-[24px] font-bold leading-tight">{pilar.titulo}</span>
          <span className="max-w-[70ch] text-[15px] opacity-90">{pilar.descricao}</span>
        </Link>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {outros.map((g) => (
            <li key={g.slug}>
              <Link href={`/guias/${g.slug}`} prefetch={false} className="flex h-full flex-col gap-2 rounded-[22px] bg-raised p-5 hover:bg-sunken">
                <span className="text-[17px] font-bold leading-snug">{g.titulo}</span>
                <span className="text-[14px] text-ink-muted">{g.descricao}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
