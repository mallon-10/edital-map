import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BotaoEditalOficial } from '@/components/BotaoEditalOficial';
import { Cabecalho } from '@/components/Cabecalho';
import { CartaoLimite } from '@/components/CartaoLimite';
import { BotaoCompartilhar } from '@/components/edital/BotaoCompartilhar';
import { DocumentosEdital } from '@/components/edital/DocumentosEdital';
import { FichaEdital } from '@/components/edital/FichaEdital';
import { ListaItens } from '@/components/edital/ListaItens';
import { PrincipaisInformacoes } from '@/components/edital/PrincipaisInformacoes';
import { Relacionados } from '@/components/edital/Relacionados';
import { ResumoOportunidade } from '@/components/edital/ResumoOportunidade';
import { TextoRecolhivel } from '@/components/edital/TextoRecolhivel';
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { TAG_PRAZO, TEXTO_PRAZO } from '@/components/estilosPrazo';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { RegistrarAbertura } from '@/components/RegistrarAbertura';
import { VitrineEmBreve } from '@/components/VitrineEmBreve';
import { NOMES_UF } from '@/lib/estados';
import { SLUG_EDITAL } from '@/lib/eventos';
import { descricaoDoEdital, editalAberto, jsonLdMigalhas } from '@/lib/seo/textos';
import { linkOficial, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { resumoOportunidade } from '@/lib/resumoEdital';
import { arquivosDoEdital, atualizadoEm, edital, itensDoEdital, relacionados, resumoItens } from '@/lib/servidor/consultas';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { decidirEdital, usoDoDia } from '@/lib/servidor/uso';
import { avisoSituacao, rotuloSituacao } from '@/lib/situacao';
import { assunto, lotesDaInfo, nomeProprio, paragrafos } from '@/lib/texto';
import type { Edital, EditalRelacionado, ResumoItens } from '@/lib/tipos';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ itens?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_EDITAL.test(slug)) return { title: 'Edital' };
  const e = await edital(slug);
  if (!e) return { title: 'Edital não encontrado' };
  const t = assunto(e.objeto).titulo;
  const titulo = t.length > 70 ? `${t.slice(0, 69)}…` : t;
  const descricao = descricaoDoEdital(e);
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/edital/${e.slug}` },
    openGraph: { title: titulo, description: descricao, url: `/edital/${e.slug}` },
    // Encerrado, revogado ou anulado sai do índice; apagado pela retenção já é 404.
    robots: editalAberto(e, new Date()) ? undefined : { index: false, follow: true },
  };
}

const ETIQUETA = 'rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted';

/** Resumo de reserva: se a consulta do resumo falhar, a página do edital continua de pé. */
const RESUMO_VAZIO: ResumoItens = { total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [] };

/** Itens, documentos, resumo e parecidos: só consultados quando o edital está liberado para este navegador hoje. */
async function detalhesDoEdital(e: Edital, todos: boolean) {
  const [itens, arquivos, resumo, parecidos] = await Promise.all([
    itensDoEdital(e, todos ? 2000 : 50),
    arquivosDoEdital(e),
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    // Falha nos parecidos não derruba a página: o bloco só não aparece.
    relacionados(e.id).catch((erro: unknown): EditalRelacionado[] => {
      console.error(`relacionados ${e.id}:`, erro);
      return [];
    }),
  ]);
  // O total vem do resumo gravado pelo worker; sem resumo ainda, do que o PNCP devolveu agora.
  return { itens, arquivos, resumo, parecidos, totalItens: Math.max(resumo.total, itens?.length ?? 0) };
}

export default async function PaginaEdital({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const { itens: modoItens } = await searchParams;
  if (!SLUG_EDITAL.test(slug)) notFound();
  const e = await edital(slug);
  if (!e) notFound();

  // Cada edital diferente aberto no dia conta no grátis (reabrir não conta). Interno e visitante sem cookie: liberado.
  const ctx = await contextoDaPagina();
  const decisao = await decidirEdital(ctx, e.slug);
  const todos = modoItens === 'todos';
  // A faixa do plano grátis lê o uso depois de contar este edital.
  const [atualizado, detalhes, uso] = await Promise.all([
    atualizadoEm(),
    decisao.permitido ? detalhesDoEdital(e, todos) : Promise.resolve(null),
    usoDoDia(ctx),
  ]);
  const agora = new Date();
  const p = prazo(e.encerramento_em, agora);
  const titulo = assunto(e.objeto);
  const local = `${e.municipio_nome ?? '—'}/${e.uf}`;
  const nomeUf = NOMES_UF[e.uf] ?? e.uf;
  const lotes = e.info_complementar ? lotesDaInfo(e.info_complementar) : null;
  const textoInfo = e.info_complementar && !lotes ? paragrafos(e.info_complementar) : [];
  const exclusivoTotal = detalhes !== null && detalhes.resumo.total > 0 && detalhes.resumo.exclusivos === detalhes.resumo.total;
  const aviso = avisoSituacao(e.situacao_id);
  // Revogada ou anulada (link direto): só o rótulo da situação, sem a tag de prazo "Aberta".
  const rotuloSit = rotuloSituacao(e.situacao_id);
  const encerradaPorSituacao = rotuloSit === 'Revogada' || rotuloSit === 'Anulada';

  return (
    <>
      <Cabecalho uso={uso} />
      <FaixaCobertura atualizadoEm={atualizado} />
      {detalhes ? <RegistrarAbertura slug={e.slug} /> : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLdMigalhas([
              { nome: 'Início', caminho: '/' },
              { nome: 'Licitações', caminho: '/licitacoes' },
              { nome: nomeUf, caminho: `/licitacoes/${e.uf.toLowerCase()}` },
              { nome: titulo.titulo, caminho: `/edital/${e.slug}` },
            ]),
          ).replace(/</g, '\\u003c'),
        }}
      />
      {/* Celular: espaço no fim para a barra fixa do "Abrir edital oficial" (a de navegação já tem o dela). */}
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-28 pt-6 md:px-6 lg:pb-6">
        <nav aria-label="Caminho" className="flex flex-wrap gap-2 text-[13px] text-ink-muted">
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/licitacoes/${e.uf.toLowerCase()}`} prefetch={false} className="hover:underline">{nomeUf}</Link>
          <span aria-hidden="true">/</span>
          <span>{local}</span>
        </nav>

        <section className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {encerradaPorSituacao ? null : (
                <>
                  <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.situacao}</span>
                  <span className={`text-[13px] ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
                </>
              )}
              <EtiquetaSituacao situacaoId={e.situacao_id} />
              {titulo.tipo ? <span className={ETIQUETA}>{titulo.tipo}</span> : null}
              {e.modalidade_nome ? <span className={ETIQUETA}>{modalidadeCurta(e.modalidade_nome)}</span> : null}
              {e.srp ? <span className={ETIQUETA}>Registro de preços</span> : null}
              {exclusivoTotal ? <span className="rounded-xs bg-mata-soft px-2 py-0.5 text-xs font-semibold text-mata">Exclusivo ME/EPP</span> : null}
            </div>
            <h1 className="break-words text-[26px] font-bold leading-tight tracking-[-0.015em] md:text-[32px]">{titulo.titulo}</h1>
            <p className="text-[15px] text-ink-muted">
              {[nomeProprio(e.orgao_nome), e.unidade_nome ? nomeProprio(e.unidade_nome) : null, local].filter(Boolean).join(' · ')}
            </p>
            {aviso ? (
              <p role="note" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] text-pin-strong">
                {aviso}
              </p>
            ) : null}
          </div>
          {/* "Abrir edital oficial" e "Compartilhar" ficam sempre à mão, inclusive com os editais grátis do dia esgotados:
              o cartão dos planos esconde o detalhe, não a fonte oficial. */}
          <div className="flex flex-wrap gap-2">
            <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} />
            <BotaoCompartilhar titulo={titulo.titulo} slug={e.slug} />
            <Link
              href={`/alertas?uf=${e.uf}`}
              className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
            >
              Criar alerta para editais parecidos
            </Link>
          </div>
        </section>

        {/* Celular: "Abrir edital oficial" fixo acima da barra de navegação (sempre, como no cabeçalho do computador). */}
        <div className="fixed inset-x-0 bottom-[var(--altura-barra)] z-30 border-t border-line bg-raised py-3 pl-[calc(16px+env(safe-area-inset-left))] pr-[calc(16px+env(safe-area-inset-right))] lg:hidden">
          <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} variante="barra" />
        </div>

        {/* Tudo abaixo do cabeçalho fica atrás do cartão quando os editais grátis do dia acabaram.
            Seção nova da página entra dentro deste bloco (e a consulta dela, em detalhesDoEdital). */}
        {detalhes ? (
          <>
            <ResumoOportunidade frases={resumoOportunidade(e)} />
            <FichaEdital edital={e} agora={agora} atualizadoEm={atualizado} />
            <PrincipaisInformacoes edital={e} resumo={{ ...detalhes.resumo, total: detalhes.totalItens }} agora={agora} />

            <div className="flex flex-wrap items-start gap-5">
              <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
                <section className="rounded-lg border border-line bg-raised p-5">
                  <h2 className="mb-1 text-[17px] font-bold">Documentos do edital</h2>
                  <p className="mb-2 text-[13px] text-ink-muted">Os documentos exigidos para participar estão no edital e no termo de referência.</p>
                  <DocumentosEdital arquivos={detalhes.arquivos} slug={e.slug} />
                </section>
                <section className="rounded-lg border border-line bg-raised p-5">
                  <h2 className="mb-3 text-[17px] font-bold">Itens da licitação</h2>
                  <ListaItens itens={detalhes.itens} total={detalhes.totalItens} slug={e.slug} todos={todos} />
                </section>
                <Relacionados editais={detalhes.parecidos} origem={e.slug} agora={agora} />
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
                  ) : textoInfo.length > 0 ? (
                    <TextoRecolhivel paragrafos={textoInfo} />
                  ) : (
                    <p className="text-[15px] text-ink-muted">Não informado pelo órgão.</p>
                  )}
                </section>
              </div>
              <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
                <VitrineEmBreve slug={e.slug} />
                <section className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5 text-[15px]">
                  <h2 className="text-base font-bold">Local</h2>
                  <p>
                    <span className="block text-xs text-ink-muted">Sede do órgão comprador</span>
                    {local}
                  </p>
                  <p className="text-[13px] text-ink-muted">O local de entrega pode ser outro: confira no edital.</p>
                </section>
                <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">
                  O Edital Map ajuda a encontrar editais. Não participa da licitação: as regras valem conforme o edital oficial.
                </p>
              </aside>
            </div>
          </>
        ) : (
          <CartaoLimite tipo="edital" plano={decisao.permitido ? undefined : decisao.plano} />
        )}
      </main>
    </>
  );
}
