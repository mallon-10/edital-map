import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { CardLista } from '@/components/inicio/CardLista';
import type { UsoHoje } from '@/lib/limites';
import { jsonLdPerguntas, PERGUNTAS_LICITACOES } from '@/lib/seo/marca';
import { buscaDaPagina, introDaPagina, jsonLdMigalhas, migalhas, type Pagina, tituloDaPagina, vizinhos } from '@/lib/seo/textos';
import { atualizadoEm } from '@/lib/servidor/consultas';
import { dadosDaPagina, type DadosDaPagina } from '@/lib/servidor/licitacoes';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usoDoDia } from '@/lib/servidor/uso';

const ESCAPE_MENOR = '\\u003c';

type Props = DadosDaPagina & { pagina: Pagina; atualizadoEm: string | null; uso: UsoHoje | null };

/** Página fixa de /licitacoes (assunto, UF ou os dois): lista dos que encerram antes, link para o mapa e páginas vizinhas. */
export function PaginaLicitacoes({ pagina, total, editais, porUf, cidades, atualizadoEm: atualizado, uso }: Props) {
  const agora = new Date();
  const caminho = migalhas(pagina);
  const links = vizinhos(pagina, porUf);
  // Página /licitacoes (Brasil, sem assunto e sem UF): perguntas frequentes para quem chega pela busca.
  const ehBrasil = !pagina.assunto && !pagina.uf;
  return (
    <>
      <Cabecalho uso={uso} />
      <FaixaCobertura atualizadoEm={atualizado} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMigalhas(caminho)).replace(/</g, '\\u003c') }}
      />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-28 pt-6 md:px-6 lg:pb-10">
        <nav aria-label="Caminho" className="flex flex-wrap gap-2 text-[13px] text-ink-muted">
          {caminho.map((c, i) => (
            <span key={c.caminho} className="flex gap-2">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {i < caminho.length - 1 ? (
                <Link href={c.caminho} prefetch={false} className="hover:underline">{c.nome}</Link>
              ) : (
                <span>{c.nome}</span>
              )}
            </span>
          ))}
        </nav>
        <header className="flex flex-col gap-3">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em] text-ink md:text-[32px]">{tituloDaPagina(pagina)}</h1>
          <p className="max-w-[72ch] text-[15px] text-ink-muted">
            {total === null ? 'Lista indisponível agora. Tente de novo em alguns minutos.' : introDaPagina(pagina, total)}
          </p>
          <div>
            <Link
              href={buscaDaPagina(pagina)}
              prefetch={false}
              className="inline-flex h-10 items-center rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin hover:bg-pin-strong"
            >
              Ver todos no mapa
            </Link>
          </div>
        </header>
        {editais.length > 0 ? (
          <section aria-label="Editais abertos" className="flex flex-col gap-3">
            {editais.map((e) => <CardLista key={e.id} edital={e} agora={agora} />)}
          </section>
        ) : null}
        {cidades.length > 0 ? (
          <section aria-labelledby="cidades" className="flex flex-col gap-3">
            <h2 id="cidades" className="text-lg font-bold text-ink">Cidades com mais licitações</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cidades.map((c) => (
                <li key={c.ibge}>
                  <Link
                    href={`/licitacoes/${c.uf.toLowerCase()}/${c.slug}`}
                    prefetch={false}
                    className="flex justify-between gap-3 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-sunken"
                  >
                    <span>{c.nome}</span>
                    <span className="text-ink-muted">{c.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {ehBrasil ? (
          <section aria-labelledby="perguntas" className="flex max-w-[78ch] flex-col gap-4">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerguntas(PERGUNTAS_LICITACOES)).replace(/</g, ESCAPE_MENOR) }}
            />
            <h2 id="perguntas" className="text-lg font-bold text-ink">Perguntas frequentes sobre licitações</h2>
            {PERGUNTAS_LICITACOES.map((p) => (
              <div key={p.pergunta} className="flex flex-col gap-1">
                <h3 className="text-[15px] font-bold text-ink">{p.pergunta}</h3>
                <p className="text-[15px] text-ink-muted">{p.resposta}</p>
              </div>
            ))}
          </section>
        ) : null}
        {links.length > 0 ? (
          <section aria-labelledby="vizinhos" className="flex flex-col gap-3">
            <h2 id="vizinhos" className="text-lg font-bold text-ink">Veja também</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((l) => (
                <li key={l.caminho}>
                  <Link
                    href={l.caminho}
                    prefetch={false}
                    className="flex justify-between gap-3 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-sunken"
                  >
                    <span>{l.nome}</span>
                    {l.total !== null ? <span className="text-ink-muted">{l.total}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}

/** Rota completa: dados, uso do dia (só lido, nada conta aqui) e a página. */
export async function RotaLicitacoes({ pagina }: { pagina: Pagina }) {
  const ctx = await contextoDaPagina();
  const [dados, atualizado, uso] = await Promise.all([dadosDaPagina(pagina), atualizadoEm().catch(() => null), usoDoDia(ctx)]);
  return <PaginaLicitacoes pagina={pagina} {...dados} atualizadoEm={atualizado} uso={uso} />;
}
