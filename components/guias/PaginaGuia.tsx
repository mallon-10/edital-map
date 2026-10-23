import Link from 'next/link';
import type { Bloco, Guia } from '@/conteudo/tipos';
import { migalhasDoGuia, jsonLdGuia } from '@/lib/guias/jsonld';
import { DadosEstruturados, Migalhas, TextoComLinks } from './TextoComLinks';

const CARTAO = 'rounded-[22px] bg-raised p-5 lg:p-6';
const TITULO_SECAO = 'text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink';

function dataLonga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function BlocoDoGuia({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === 'paragrafo') {
    return (
      <p>
        <TextoComLinks texto={bloco.texto} />
      </p>
    );
  }
  const Lista = bloco.tipo === 'passos' ? 'ol' : 'ul';
  return (
    <Lista className={`flex flex-col gap-2 pl-6 ${bloco.tipo === 'passos' ? 'list-decimal' : 'list-disc'} marker:text-pin-strong`}>
      {bloco.itens.map((item, i) => (
        <li key={i}>
          <TextoComLinks texto={item} />
        </li>
      ))}
    </Lista>
  );
}

const ancora = (i: number) => `secao-${i + 1}`;

/** Guia: resposta direta, sumário, seções, editais abertos, perguntas, fontes e chamada para o mapa e o Pro. */
export function PaginaGuia({ guia: g, nomesDosEditais, relacionados }: {
  guia: Guia;
  /** Nome de cada caminho de `g.editais` (ex.: "Pregão eletrônico em São Paulo"). */
  nomesDosEditais: Record<string, string>;
  relacionados: Array<{ slug: string; titulo: string; descricao: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-28 pt-6 md:px-6 lg:pb-12">
      <DadosEstruturados dados={jsonLdGuia(g)} />
      <Migalhas itens={migalhasDoGuia(g)} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <article className="flex min-w-0 flex-col gap-6 text-[16px] leading-relaxed text-ink">
          <header className={`${CARTAO} flex flex-col gap-4`}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pin-strong">Guia</p>
            <h1 className="text-[30px] font-bold leading-tight tracking-[-0.015em] md:text-[36px]">{g.titulo}</h1>
            <p className="max-w-[68ch] text-[17px]">
              <TextoComLinks texto={g.resposta} />
            </p>
            <p className="text-[13px] text-ink-muted">
              Revisado em <time dateTime={g.revisadoEm}>{dataLonga(g.revisadoEm)}</time> ·{' '}
              <a href="#fontes" className="underline underline-offset-2">
                Fontes oficiais
              </a>
            </p>
          </header>
          {g.secoes.map((s, i) => (
            <section key={s.titulo} id={ancora(i)} aria-labelledby={`${ancora(i)}-t`} className="flex max-w-[72ch] scroll-mt-24 flex-col gap-3">
              <h2 id={`${ancora(i)}-t`} className={TITULO_SECAO}>
                {s.titulo}
              </h2>
              {s.blocos.map((b, j) => (
                <BlocoDoGuia key={j} bloco={b} />
              ))}
            </section>
          ))}
          {g.editais.length > 0 ? (
            <section aria-labelledby="editais" className={`${CARTAO} flex flex-col gap-3`}>
              <h2 id="editais" className={TITULO_SECAO}>
                Editais abertos agora
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {g.editais.map((c) => (
                  <li key={c}>
                    <Link
                      href={c}
                      prefetch={false}
                      className="flex h-full items-center justify-between gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-[15px] font-semibold hover:bg-sunken"
                    >
                      {nomesDosEditais[c] ?? c}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="perguntas" className="flex max-w-[72ch] flex-col gap-4">
            <h2 id="perguntas" className={TITULO_SECAO}>
              Perguntas frequentes
            </h2>
            {g.perguntas.map((p) => (
              <div key={p.pergunta} className="flex flex-col gap-1">
                <h3 className="text-[17px] font-bold">
                  <TextoComLinks texto={p.pergunta} />
                </h3>
                <p>
                  <TextoComLinks texto={p.resposta} />
                </p>
              </div>
            ))}
          </section>
          <section id="fontes" aria-labelledby="fontes-t" className="flex max-w-[72ch] scroll-mt-24 flex-col gap-2">
            <h2 id="fontes-t" className="text-[18px] font-bold">
              Fontes oficiais
            </h2>
            <ul className="flex list-disc flex-col gap-1 pl-6 text-[15px]">
              {g.fontes.map((f) => (
                <li key={f.url}>
                  <a href={f.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-pin-strong">
                    {f.nome}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-ink-muted">
              Este guia explica a regra geral. Cada edital tem regras próprias: confira sempre o edital e a lei antes de participar.
            </p>
          </section>
          <section className="flex flex-col gap-3 rounded-[22px] bg-ink p-6 text-surface lg:p-8">
            <h2 className="text-[22px] font-bold leading-tight">Encontre os editais abertos do seu ramo</h2>
            <p className="max-w-[60ch] text-[15px] opacity-90">
              O Edital Map mostra no mapa as licitações abertas do PNCP, atualizadas a cada 3 horas. Com o Pro, as novas chegam no seu e-mail.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/" prefetch={false} className="inline-flex h-11 items-center rounded-full bg-pin px-5 text-[15px] font-semibold text-on-pin hover:bg-pin-strong hover:text-surface">
                Ver editais no mapa
              </Link>
              <Link href="/planos" prefetch={false} className="inline-flex h-11 items-center rounded-full border border-surface/40 px-5 text-[15px] font-semibold hover:bg-surface/10">
                Conhecer o Pro
              </Link>
            </div>
          </section>
        </article>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <nav aria-label="Neste guia" className={`${CARTAO} hidden flex-col gap-2 lg:flex`}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Neste guia</p>
            <ol className="flex flex-col gap-1.5 text-[14px]">
              {g.secoes.map((s, i) => (
                <li key={s.titulo}>
                  <a href={`#${ancora(i)}`} className="hover:text-pin-strong hover:underline">
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          {relacionados.length > 0 ? (
            <nav aria-label="Guias relacionados" className={`${CARTAO} flex flex-col gap-3`}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Leia também</p>
              <ul className="flex flex-col gap-3">
                {relacionados.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/guias/${r.slug}`} prefetch={false} className="flex flex-col gap-0.5 hover:text-pin-strong">
                      <span className="text-[15px] font-semibold">{r.titulo}</span>
                      <span className="text-[13px] text-ink-muted">{r.descricao}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
