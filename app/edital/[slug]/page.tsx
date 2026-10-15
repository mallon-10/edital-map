import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { BotaoEditalOficial } from '@/components/BotaoEditalOficial';
import { Cabecalho } from '@/components/Cabecalho';
import { TAG_PRAZO, TEXTO_PRAZO } from '@/components/estilosPrazo';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { RegistrarAbertura } from '@/components/RegistrarAbertura';
import { TabelaItens } from '@/components/TabelaItens';
import { VitrineEmBreve } from '@/components/VitrineEmBreve';
import { SLUG_EDITAL } from '@/lib/eventos';
import { data, dataHora, haQuanto, linkOficial, moeda, numero, prazo } from '@/lib/formato';
import { atualizadoEm, edital, itensDoEdital } from '@/lib/servidor/consultas';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ itens?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_EDITAL.test(slug)) return { title: 'Edital' };
  const e = await edital(slug);
  return { title: e ? e.objeto.slice(0, 70) : 'Edital não encontrado' };
}

function Bloco({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-line bg-raised p-4">
      <span className="text-xs text-ink-muted">{rotulo}</span>
      {children}
    </div>
  );
}

const ETIQUETA = 'rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted';

export default async function PaginaEdital({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const { itens: modoItens } = await searchParams;
  if (!SLUG_EDITAL.test(slug)) notFound();
  const e = await edital(slug);
  if (!e) notFound();

  const todos = modoItens === 'todos';
  const [itens, atualizado] = await Promise.all([itensDoEdital(e.id, todos ? 2000 : 50), atualizadoEm()]);
  const agora = new Date();
  const p = prazo(e.encerramento_em, agora);
  const valor = moeda(e.valor_estimado);
  const local = `${e.municipio_nome ?? '—'}/${e.uf}`;

  return (
    <>
      <Cabecalho />
      <FaixaCobertura atualizadoEm={atualizado} />
      <RegistrarAbertura slug={e.slug} />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 md:px-6">
        <nav aria-label="Caminho" className="flex flex-wrap gap-2 text-[13px] text-ink-muted">
          <Link href="/" className="hover:underline">Mapa</Link>
          <span aria-hidden="true">/</span>
          <span>{local}</span>
        </nav>

        <section className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.situacao}</span>
              <span className={`text-[13px] ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
              {e.modalidade_nome ? <span className={ETIQUETA}>{e.modalidade_nome}</span> : null}
              {e.srp ? <span className={ETIQUETA}>Registro de preços</span> : null}
            </div>
            <h1 className="break-words text-[26px] font-bold leading-tight tracking-[-0.015em] md:text-[32px]">{e.objeto}</h1>
            <p className="text-[15px] text-ink-muted">{[e.orgao_nome, e.unidade_nome, local].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} />
            <Link
              href={`/alertas?uf=${e.uf}`}
              className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
            >
              Criar alerta para editais parecidos
            </Link>
          </div>
        </section>

        <section aria-label="Resumo" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <Bloco rotulo="Valor estimado">
            {valor ? <span className="font-mono text-[22px] font-medium">{valor}</span> : <span className="text-ink-muted">Valor não informado</span>}
          </Bloco>
          <Bloco rotulo="Propostas até">
            <span className="font-mono text-[22px] font-medium">{e.encerramento_em ? dataHora(e.encerramento_em) : '—'}</span>
            <span className={`text-xs ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
          </Bloco>
          <Bloco rotulo="Itens">
            <span className="font-mono text-[22px] font-medium">{numero(itens.total)}</span>
          </Bloco>
          <Bloco rotulo="Publicado no PNCP">
            <span className="font-mono text-[22px] font-medium">{e.publicada_em ? data(e.publicada_em) : '—'}</span>
          </Bloco>
        </section>

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
            <section className="rounded-lg border border-line bg-raised p-5">
              <h2 className="mb-3 text-[17px] font-bold">Itens da licitação</h2>
              <TabelaItens itens={itens.itens} total={itens.total} slug={e.slug} todos={todos} />
            </section>
            {e.info_complementar ? (
              <section className="rounded-lg border border-line bg-raised p-5">
                <h2 className="mb-2 text-[17px] font-bold">Informações complementares</h2>
                <p className="whitespace-pre-line break-words text-[15px]">{e.info_complementar}</p>
              </section>
            ) : null}
          </div>
          <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
            <VitrineEmBreve slug={e.slug} />
            <section className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5 text-[15px]">
              <h2 className="text-base font-bold">Local e dados</h2>
              <p>
                <span className="block text-xs text-ink-muted">Sede do órgão comprador</span>
                {local}
              </p>
              <p className="text-[13px] text-ink-muted">O local de entrega pode ser outro: confira no edital.</p>
              {e.situacao_nome ? (
                <p>
                  <span className="block text-xs text-ink-muted">Situação no PNCP</span>
                  {e.situacao_nome}
                </p>
              ) : null}
              <p className="text-[13px] text-ink-muted">Fonte: PNCP{atualizado ? ` · atualizado ${haQuanto(atualizado, agora)}` : ''}</p>
            </section>
            <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">
              O Edital Map ajuda a encontrar editais. Não participa da licitação: as regras valem conforme o edital oficial.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
