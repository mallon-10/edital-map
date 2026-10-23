import Link from 'next/link';
import type { Termo } from '@/conteudo/tipos';
import { jsonLdTermo, migalhasDoTermo } from '@/lib/guias/jsonld';
import { DadosEstruturados, Migalhas, TextoComLinks } from './TextoComLinks';

const CARTAO = 'rounded-[22px] bg-raised p-5 lg:p-6';

/** Termo do glossário: definição curta, detalhe, artigo da lei, termos relacionados e o guia mais próximo. */
export function PaginaTermo({ termo: t, relacionados, guia }: {
  termo: Termo;
  relacionados: Array<{ slug: string; nome: string }>;
  guia: { slug: string; titulo: string } | null;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-4 pb-28 pt-6 text-[16px] leading-relaxed text-ink md:px-6 lg:pb-12">
      <DadosEstruturados dados={jsonLdTermo(t)} />
      <Migalhas itens={migalhasDoTermo(t)} />
      <article className={`${CARTAO} flex flex-col gap-4`}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pin-strong">Glossário de licitações</p>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.015em] md:text-[36px]">{t.nome}</h1>
        <p className="text-[17px]">
          <TextoComLinks texto={t.definicao} />
        </p>
        {t.detalhe ? (
          <p>
            <TextoComLinks texto={t.detalhe} />
          </p>
        ) : null}
        {t.artigo ? <p className="text-[14px] text-ink-muted">Base legal: {t.artigo}</p> : null}
      </article>
      {guia ? (
        <Link
          href={`/guias/${guia.slug}`}
          prefetch={false}
          className="flex items-center justify-between gap-3 rounded-[22px] bg-pin-soft px-5 py-4 text-[15px] font-semibold text-ink hover:bg-sunken"
        >
          <span>
            <span className="block text-[13px] font-semibold uppercase tracking-[0.06em] text-pin-strong">Guia completo</span>
            {guia.titulo}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
      {relacionados.length > 0 ? (
        <section aria-labelledby="relacionados" className="flex flex-col gap-3">
          <h2 id="relacionados" className="text-[18px] font-bold">
            Termos relacionados
          </h2>
          <ul className="flex flex-wrap gap-2">
            {relacionados.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/glossario/${r.slug}`}
                  prefetch={false}
                  className="inline-flex h-10 items-center rounded-full border border-line-strong bg-raised px-4 text-[14px] font-semibold hover:bg-sunken"
                >
                  {r.nome}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-[13px] text-ink-muted">
        Definição para consulta rápida. Cada edital tem regras próprias: confira sempre o edital e a lei.{' '}
        <Link href="/glossario" prefetch={false} className="underline underline-offset-2">
          Ver todos os termos
        </Link>
      </p>
    </main>
  );
}
