import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BotaoEditalOficial } from '@/components/BotaoEditalOficial';
import { Cabecalho } from '@/components/Cabecalho';
import { ListaItens } from '@/components/edital/ListaItens';
import { PrincipaisInformacoes } from '@/components/edital/PrincipaisInformacoes';
import { Relacionados } from '@/components/edital/Relacionados';
import { TextoRecolhivel } from '@/components/edital/TextoRecolhivel';
import { TAG_PRAZO, TEXTO_PRAZO } from '@/components/estilosPrazo';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { RegistrarAbertura } from '@/components/RegistrarAbertura';
import { VitrineEmBreve } from '@/components/VitrineEmBreve';
import { SLUG_EDITAL } from '@/lib/eventos';
import { data, haQuanto, linkOficial, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { atualizadoEm, edital, itensDoEdital, relacionados, resumoItens } from '@/lib/servidor/consultas';
import { assunto, lotesDaInfo, nomeProprio, paragrafos, textoLimpo } from '@/lib/texto';
import type { EditalRelacionado, ResumoItens } from '@/lib/tipos';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ itens?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_EDITAL.test(slug)) return { title: 'Edital' };
  const e = await edital(slug);
  if (!e) return { title: 'Edital não encontrado' };
  const t = assunto(e.objeto).titulo;
  return { title: t.length > 70 ? `${t.slice(0, 69)}…` : t };
}

const ETIQUETA = 'rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted';

/** Resumo de reserva: se a consulta do resumo falhar, a página do edital continua de pé. */
const RESUMO_VAZIO: ResumoItens = { total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [] };

export default async function PaginaEdital({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const { itens: modoItens } = await searchParams;
  if (!SLUG_EDITAL.test(slug)) notFound();
  const e = await edital(slug);
  if (!e) notFound();

  const todos = modoItens === 'todos';
  const [itens, resumo, atualizado, parecidos] = await Promise.all([
    itensDoEdital(e, todos ? 2000 : 50),
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    atualizadoEm(),
    // Falha nos parecidos não derruba a página: o bloco só não aparece.
    relacionados(e.id).catch((erro: unknown): EditalRelacionado[] => {
      console.error(`relacionados ${e.id}:`, erro);
      return [];
    }),
  ]);
  // O total vem do resumo gravado pelo worker; sem resumo ainda, do que o PNCP devolveu agora.
  const totalItens = Math.max(resumo.total, itens?.length ?? 0);
  const agora = new Date();
  const p = prazo(e.encerramento_em, agora);
  const titulo = assunto(e.objeto);
  const objetoCompleto = textoLimpo(e.objeto);
  const local = `${e.municipio_nome ?? '—'}/${e.uf}`;
  const lotes = e.info_complementar ? lotesDaInfo(e.info_complementar) : null;
  const textoInfo = e.info_complementar && !lotes ? paragrafos(e.info_complementar) : [];
  const exclusivoTotal = resumo.total > 0 && resumo.exclusivos === resumo.total;

  return (
    <>
      <Cabecalho />
      <FaixaCobertura atualizadoEm={atualizado} />
      <RegistrarAbertura slug={e.slug} />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 md:px-6">
        <nav aria-label="Caminho" className="flex flex-wrap gap-2 text-[13px] text-ink-muted">
          <Link href="/" className="hover:underline">Mapa</Link>
          <span aria-hidden="true">/</span>
          <span>{local}</span>
        </nav>

        <section className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.situacao}</span>
              <span className={`text-[13px] ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
              {titulo.tipo ? <span className={ETIQUETA}>{titulo.tipo}</span> : null}
              {e.modalidade_nome ? <span className={ETIQUETA}>{modalidadeCurta(e.modalidade_nome)}</span> : null}
              {e.srp ? <span className={ETIQUETA}>Registro de preços</span> : null}
              {exclusivoTotal ? <span className="rounded-xs bg-mata-soft px-2 py-0.5 text-xs font-semibold text-mata">Exclusivo ME/EPP</span> : null}
            </div>
            <h1 className="break-words text-[26px] font-bold leading-tight tracking-[-0.015em] md:text-[32px]">{titulo.titulo}</h1>
            <p className="text-[15px] text-ink-muted">
              {[nomeProprio(e.orgao_nome), e.unidade_nome ? nomeProprio(e.unidade_nome) : null, local].filter(Boolean).join(' · ')}
            </p>
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

        <PrincipaisInformacoes edital={e} resumo={{ ...resumo, total: totalItens }} agora={agora} />

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
            <section className="rounded-lg border border-line bg-raised p-5">
              <h2 className="mb-3 text-[17px] font-bold">Itens da licitação</h2>
              <ListaItens itens={itens} total={totalItens} slug={e.slug} todos={todos} />
            </section>
            <Relacionados editais={parecidos} origem={e.slug} agora={agora} />
            {titulo.titulo !== objetoCompleto ? (
              <section className="rounded-lg border border-line bg-raised p-5">
                <details>
                  <summary className="cursor-pointer text-[17px] font-bold">Objeto completo</summary>
                  <p className="mt-2 break-words text-[15px]">{objetoCompleto}</p>
                </details>
              </section>
            ) : null}
            {lotes || textoInfo.length > 0 ? (
              <section className="rounded-lg border border-line bg-raised p-5">
                <h2 className="mb-2 text-[17px] font-bold">Informações complementares</h2>
                {lotes ? (
                  <ol className="flex flex-col gap-1.5 text-[15px]">
                    {lotes.map((l) => (
                      <li key={l.numero} className="break-words">
                        <span className="font-semibold">Lote {l.numero}</span> · {l.texto}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <TextoRecolhivel paragrafos={textoInfo} />
                )}
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
              {e.publicada_em ? (
                <p>
                  <span className="block text-xs text-ink-muted">Publicado no PNCP</span>
                  <span className="font-mono">{data(e.publicada_em)}</span>
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
