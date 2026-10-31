import { OPEN_GRAPH_BASE } from '@/lib/seo/site';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BotaoEditalOficial } from '@/components/BotaoEditalOficial';
import { Cabecalho } from '@/components/Cabecalho';
import { BotaoCompartilhar } from '@/components/edital/BotaoCompartilhar';
import { BotaoAssessoria, CartaoAssessoria } from '@/components/edital/CartaoAssessoria';
import { CartaoMonitorar } from '@/components/edital/CartaoMonitorar';
import { BotaoDescartar } from '@/components/oportunidades/BotaoDescartar';
import { BotaoSalvar } from '@/components/oportunidades/BotaoSalvar';
import { DocumentosDoPncp, ItensDoPncp } from '@/components/edital/DoPncp';
import { FichaEdital } from '@/components/edital/FichaEdital';
import { PrincipaisInformacoes } from '@/components/edital/PrincipaisInformacoes';
import { Relacionados } from '@/components/edital/Relacionados';
import { ResumoOportunidade } from '@/components/edital/ResumoOportunidade';
import { TextoRecolhivel } from '@/components/edital/TextoRecolhivel';
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { TAG_PRAZO, TEXTO_PRAZO } from '@/components/estilosPrazo';
import { RegistrarAbertura } from '@/components/RegistrarAbertura';
import { VitrineEmBreve } from '@/components/VitrineEmBreve';
import { hrefMonitorarEdital, segmentoDoEdital } from '@/lib/alertaDaBusca';
import { hrefAssessoria, mostrarAssessoria, numeroWhatsapp } from '@/lib/assessoria';
import { NOMES_UF } from '@/lib/estados';
import { SLUG_EDITAL } from '@/lib/eventos';
import { linksDoEdital } from '@/lib/seo/linksEdital';
import { descricaoDoEdital, editalAberto, jsonLdMigalhas, tituloDoEdital } from '@/lib/seo/textos';
import { dataHora, haQuanto, linkOficial, moeda, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { PRECO_PRO_MENSAL } from '@/lib/planos';
import { resumoOportunidade } from '@/lib/resumoEdital';
import { atualizadoEm, edital, relacionados, resumoItens } from '@/lib/servidor/consultas';
import { cidadesComPagina, orgaosComPagina } from '@/lib/servidor/licitacoes';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { planoDaPagina } from '@/lib/servidor/plano';
import { avisoSituacao, rotuloSituacao } from '@/lib/situacao';
import { assunto, lotesDaInfo, nomeProprio, paragrafos } from '@/lib/texto';
import type { Edital, EditalRelacionado, ResumoItens } from '@/lib/tipos';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ itens?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_EDITAL.test(slug)) return { title: 'Edital' };
  const e = await edital(slug);
  if (!e) return { title: 'Edital não encontrado' };
  const titulo = tituloDoEdital(e);
  const descricao = descricaoDoEdital(e);
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/edital/${e.slug}` },
    openGraph: { ...OPEN_GRAPH_BASE, title: titulo, description: descricao, url: `/edital/${e.slug}` },
    // Encerrado, revogado ou anulado sai do índice; apagado pela retenção já é 404.
    robots: editalAberto(e, new Date()) ? undefined : { index: false, follow: true },
  };
}

const ETIQUETA = 'inline-flex h-[26px] items-center rounded-full bg-sunken px-2.5 text-xs font-semibold text-ink-muted';
/** Blocos da página (visual novo): cartão branco sem borda e título de seção. */
const CARTAO = 'rounded-[22px] bg-raised p-5 lg:p-6';
const TITULO = 'text-[18px] font-semibold';

/** Resumo de reserva: se a consulta do resumo falhar, a página do edital continua de pé. */
const RESUMO_VAZIO: ResumoItens = { total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [] };

/** Links da ficha para as páginas /licitacoes (modalidade na UF e órgão), só com o edital aberto; falha = sem link. */
async function linksDaFicha(e: Edital): Promise<{ modalidade: string | null; orgao: string | null }> {
  if (!editalAberto(e, new Date())) return { modalidade: null, orgao: null };
  const [orgaos, cidades] = await Promise.all([orgaosComPagina(), cidadesComPagina()]);
  return linksDoEdital(e, orgaos, cidades);
}

/** Resumo dos itens, parecidos e links da ficha, do nosso banco (grátis e sem limite para todos). */
async function detalhesDoEdital(e: Edital) {
  const [resumo, parecidos, links] = await Promise.all([
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    // Falha nos parecidos não derruba a página: o bloco só não aparece.
    relacionados(e.id).catch((erro: unknown): EditalRelacionado[] => {
      console.error(`relacionados ${e.id}:`, erro);
      return [];
    }),
    linksDaFicha(e),
  ]);
  return { resumo, parecidos, links };
}

export default async function PaginaEdital({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const { itens: modoItens } = await searchParams;
  if (!SLUG_EDITAL.test(slug)) notFound();
  const e = await edital(slug);
  if (!e) notFound();

  const ctx = await contextoDaPagina();
  const todos = modoItens === 'todos';
  // Só a chave da compra vai ao navegador (o PNCP é lido de lá).
  const compra = { id: e.id, cnpj: e.cnpj, ano: e.ano, sequencial: e.sequencial };
  const [atualizado, detalhes, plano] = await Promise.all([atualizadoEm(), detalhesDoEdital(e), planoDaPagina(ctx)]);
  const agora = new Date();
  const p = prazo(e.encerramento_em, agora);
  const titulo = assunto(e.objeto);
  const local = `${e.municipio_nome ?? '—'}/${e.uf}`;
  const nomeUf = NOMES_UF[e.uf] ?? e.uf;
  const lotes = e.info_complementar ? lotesDaInfo(e.info_complementar) : null;
  const textoInfo = e.info_complementar && !lotes ? paragrafos(e.info_complementar) : [];
  const exclusivoTotal = detalhes.resumo.total > 0 && detalhes.resumo.exclusivos === detalhes.resumo.total;
  const aviso = avisoSituacao(e.situacao_id);
  // Revogada ou anulada (link direto): só o rótulo da situação, sem a tag de prazo "Aberta".
  const rotuloSit = rotuloSituacao(e.situacao_id);
  const encerradaPorSituacao = rotuloSit === 'Revogada' || rotuloSit === 'Anulada';
  const valorEstimado = moeda(e.valor_estimado);
  // Edital aberto e número configurado (WHATSAPP_ASSESSORIA na Vercel).
  const assessoria = numeroWhatsapp(process.env.WHATSAPP_ASSESSORIA) && mostrarAssessoria(e, agora) ? hrefAssessoria(e.slug) : null;
  // Monitorar parecidos: para quem é Pro, vai direto ao formulário preenchido, sem falar em preço.
  const monitorar = {
    href: hrefMonitorarEdital(e.objeto, e.uf),
    segmento: segmentoDoEdital(e.objeto)?.termo ?? null,
    preco: plano.plano === 'gratis' && !plano.dono ? PRECO_PRO_MENSAL : null,
  };

  return (
    <>
      {/* A oferta do Pro aqui é o cartão de monitorar, com o assunto do edital: sem a faixa genérica. */}
      <Cabecalho plano={plano} semOferta />
      <RegistrarAbertura slug={e.slug} />
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
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pb-28 pt-2 lg:gap-6 lg:px-6 lg:pb-10 lg:pt-3">
        <nav aria-label="Caminho" className="flex flex-wrap gap-2 px-1 text-[13px] text-ink-muted">
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/licitacoes/${e.uf.toLowerCase()}`} prefetch={false} className="hover:underline">{nomeUf}</Link>
          <span aria-hidden="true">/</span>
          <span>{local}</span>
        </nav>

        {/* Cartão do topo (visual novo, como o da página inicial): situação, título, quem compra, valor, prazo e as ações. */}
        <section aria-labelledby="titulo-edital" className="flex flex-col gap-5 rounded-[26px] bg-raised p-5 lg:gap-7 lg:rounded-[28px] lg:p-10">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted lg:text-xs">
            Fonte PNCP{atualizado ? ` · atualizado ${haQuanto(atualizado, agora)}` : ''}
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {encerradaPorSituacao ? null : (
                <span className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.situacao}</span>
              )}
              <EtiquetaSituacao situacaoId={e.situacao_id} />
              {titulo.tipo ? <span className={ETIQUETA}>{titulo.tipo}</span> : null}
              {e.modalidade_nome ? <span className={ETIQUETA}>{modalidadeCurta(e.modalidade_nome)}</span> : null}
              {e.srp ? <span className={ETIQUETA}>Registro de preços</span> : null}
              {exclusivoTotal ? <span className="inline-flex h-[26px] items-center rounded-full bg-mata-soft px-2.5 text-xs font-semibold text-mata">Exclusivo ME/EPP</span> : null}
            </div>
            <h1
              id="titulo-edital"
              className="break-words text-[26px] font-bold leading-[30px] tracking-[-0.015em] lg:text-[38px] lg:leading-[44px] lg:tracking-[-0.02em]"
            >
              {titulo.titulo}
            </h1>
            <p className="text-[15px] text-ink-muted lg:text-[17px]">
              {[nomeProprio(e.orgao_nome), e.unidade_nome ? nomeProprio(e.unidade_nome) : null, local].filter(Boolean).join(' · ')}
            </p>
            {aviso ? (
              <p role="note" className="rounded-[14px] bg-pin-soft px-4 py-3 text-[14px] text-pin-strong">
                {aviso}
              </p>
            ) : null}
          </div>
          <dl className="grid grid-cols-1 gap-4 border-t border-line pt-5 min-[420px]:grid-cols-2 lg:flex lg:gap-14">
            <div className="flex flex-col gap-1">
              <dt className="text-[13px] text-ink-muted">Valor estimado</dt>
              <dd className={valorEstimado ? 'font-mono text-[20px] font-medium lg:text-[24px]' : 'text-[15px] text-ink-muted'}>
                {valorEstimado ?? 'Valor não informado'}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[13px] text-ink-muted">Propostas até</dt>
              <dd className="font-mono text-[17px] font-medium lg:text-[20px]">{e.encerramento_em ? dataHora(e.encerramento_em) : 'Não informado'}</dd>
              {encerradaPorSituacao || !e.encerramento_em ? null : <dd className={`text-[14px] font-semibold ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</dd>}
            </div>
          </dl>
          {/* "Abrir edital oficial" (no computador aqui; no celular, fixo embaixo) e "Compartilhar" para todos; Salvar e
              Descartar também (a rota decide o plano). */}
          <div className="flex flex-wrap gap-2.5 lg:gap-3">
            <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} />
            {assessoria ? <BotaoAssessoria href={assessoria} /> : null}
            <BotaoCompartilhar titulo={titulo.titulo} slug={e.slug} />
            <BotaoSalvar id={e.id} variante="botao" />
            <BotaoDescartar id={e.id} />
          </div>
        </section>

        {/* Celular: "Abrir edital oficial" fixo acima da barra de navegação (sempre, como no cartão do topo do computador). */}
        <div className="fixed inset-x-0 bottom-[var(--altura-barra)] z-30 border-t border-line bg-raised py-3 pl-[calc(16px+env(safe-area-inset-left))] pr-[calc(16px+env(safe-area-inset-right))] lg:hidden">
          <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} variante="barra" />
        </div>

        {/* As duas ofertas logo abaixo do cartão principal: ajuda com este edital e acompanhar os próximos. */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
          {assessoria ? <CartaoAssessoria href={assessoria} edital={e.slug} id="assessoria" /> : null}
          <CartaoMonitorar {...monitorar} />
        </div>

        {/* Seção nova da página entra aqui (e a consulta dela, em detalhesDoEdital). */}
        <ResumoOportunidade frases={resumoOportunidade(e)} />
        <PrincipaisInformacoes edital={e} resumo={detalhes.resumo} agora={agora} />

        <div className="flex flex-wrap items-start gap-5 lg:gap-6">
          <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5 lg:gap-6">
            <section aria-labelledby="documentos" className={CARTAO}>
              <h2 id="documentos" className={TITULO}>Documentos do edital</h2>
              <p className="mb-2 mt-1 text-[14px] text-ink-muted">Os documentos exigidos para participar estão no edital e no termo de referência.</p>
              {/* Documentos e itens vêm do PNCP no navegador, depois que a página abre (components/edital/DoPncp.tsx). */}
              <DocumentosDoPncp compra={compra} slug={e.slug} />
            </section>
            <section aria-labelledby="itens" className={CARTAO}>
              <h2 id="itens" className={`${TITULO} mb-3`}>Itens da licitação</h2>
              <ItensDoPncp compra={compra} slug={e.slug} todos={todos} totalResumo={detalhes.resumo.total} />
            </section>
            <Relacionados editais={detalhes.parecidos} origem={e.slug} agora={agora} />
            <section aria-labelledby="complementares" className={CARTAO}>
              <h2 id="complementares" className={`${TITULO} mb-2`}>Informações complementares</h2>
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
          <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5 lg:gap-6">
            <FichaEdital edital={e} agora={agora} atualizadoEm={atualizado} links={detalhes.links} />
            <VitrineEmBreve slug={e.slug} />
            <section aria-labelledby="local" className={`${CARTAO} flex flex-col gap-3 text-[15px]`}>
              <h2 id="local" className={TITULO}>Local</h2>
              <p>
                <span className="block text-[13px] text-ink-muted">Sede do órgão comprador</span>
                {local}
              </p>
              <p className="text-[13px] text-ink-muted">O local de entrega pode ser outro: confira no edital.</p>
            </section>
            <p className="rounded-[18px] bg-sunken p-4 text-[13px] text-ink-muted">
              O Edital Map ajuda a encontrar editais. Não participa da licitação: as regras valem conforme o edital oficial.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
