import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { CardLista } from '@/components/inicio/CardLista';
import { NOMES_UF } from '@/lib/estados';
import { UFS_BRASIL } from '@/lib/eventos';
import { ASSUNTOS } from '@/lib/seo/assuntos';
import { jsonLdPerguntas, PERGUNTAS_LICITACOES } from '@/lib/seo/marca';
import { MODALIDADES } from '@/lib/seo/modalidades';
import type { PlanoDaPagina } from '@/lib/planos';
import { buscaDaPagina, caminhoDaPagina, introDaPagina, jsonLdMigalhas, migalhas, type Pagina, tituloDaPagina, type Vizinho, vizinhos } from '@/lib/seo/textos';
import { atualizadoEm } from '@/lib/servidor/consultas';
import { dadosDaPagina, type DadosDaPagina } from '@/lib/servidor/licitacoes';
import { planoDaPagina } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';

const ESCAPE_MENOR = '\\u003c';
/** Cidades da UF que aparecem abertas; o resto fica em "Todas as cidades". */
const CIDADES_VISIVEIS = 30;
const maiuscula = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** Grade de links (cidades, órgãos, vizinhos e seções do índice). */
function Grade({ links }: { links: Vizinho[] }) {
  return (
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
  );
}

function Secao({ id, titulo, links }: { id: string; titulo: string; links: Vizinho[] }) {
  if (links.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-bold text-ink">{titulo}</h2>
      <Grade links={links} />
    </section>
  );
}

/** Seções do índice /licitacoes: modalidades, assuntos, estados e os órgãos com mais editais. */
function SecoesDoIndice({ orgaos }: { orgaos: Vizinho[] }) {
  const ufs = [...UFS_BRASIL].sort((a, b) => NOMES_UF[a].localeCompare(NOMES_UF[b], 'pt-BR'));
  return (
    <>
      <Secao
        id="por-modalidade"
        titulo="Por modalidade"
        links={MODALIDADES.map((m) => ({ nome: maiuscula(m.nome), caminho: caminhoDaPagina({ assunto: null, modalidade: m, uf: null }), total: null }))}
      />
      <Secao
        id="por-assunto"
        titulo="Por assunto"
        links={ASSUNTOS.map((a) => ({ nome: maiuscula(a.nome), caminho: caminhoDaPagina({ assunto: a, uf: null }), total: null }))}
      />
      <Secao id="por-estado" titulo="Por estado" links={ufs.map((uf) => ({ nome: NOMES_UF[uf], caminho: caminhoDaPagina({ assunto: null, uf }), total: null }))} />
      <Secao id="orgaos" titulo="Órgãos com mais licitações abertas" links={orgaos} />
    </>
  );
}

type Props = DadosDaPagina & { pagina: Pagina; atualizadoEm: string | null; plano: PlanoDaPagina | null };

/** Página fixa de /licitacoes (assunto, UF ou os dois): lista dos que encerram antes, link para o mapa e páginas vizinhas. */
export function PaginaLicitacoes({ pagina, total, editais, porUf, cidades, orgaosDaCidade, orgaos, atualizadoEm: atualizado, plano }: Props) {
  const agora = new Date();
  const caminho = migalhas(pagina);
  const links = vizinhos(pagina, porUf, pagina.orgao ? orgaos : []);
  // Página /licitacoes (Brasil, sem assunto, modalidade nem UF): seções do índice e perguntas frequentes.
  const ehBrasil = !pagina.assunto && !pagina.modalidade && !pagina.uf && !pagina.orgao;
  const cidadesLinks = cidades.map((c) => ({ nome: c.nome, caminho: `/licitacoes/${c.uf.toLowerCase()}/${c.slug}`, total: c.total }));
  return (
    <>
      <Cabecalho plano={plano} />
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
          {pagina.modalidade ? <p className="max-w-[72ch] text-[15px] text-ink">{pagina.modalidade.explicacao}</p> : null}
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
        {pagina.cidade ? <Secao id="orgaos-cidade" titulo={`Órgãos que mais compram em ${pagina.cidade.nome}`} links={orgaosDaCidade} /> : null}
        {cidadesLinks.length > 0 ? (
          <section aria-labelledby="cidades" className="flex flex-col gap-3">
            <h2 id="cidades" className="text-lg font-bold text-ink">Cidades com mais licitações</h2>
            <Grade links={cidadesLinks.slice(0, CIDADES_VISIVEIS)} />
            {cidadesLinks.length > CIDADES_VISIVEIS ? (
              <details className="flex flex-col gap-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">Todas as cidades ({cidadesLinks.length})</summary>
                <div className="pt-3">
                  <Grade links={cidadesLinks.slice(CIDADES_VISIVEIS)} />
                </div>
              </details>
            ) : null}
          </section>
        ) : null}
        {ehBrasil ? <SecoesDoIndice orgaos={orgaos} /> : null}
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
        <Secao id="vizinhos" titulo="Veja também" links={links} />
      </main>
    </>
  );
}

/** Rota completa: dados, plano do visitante (para o cabeçalho) e a página. */
export async function RotaLicitacoes({ pagina }: { pagina: Pagina }) {
  const ctx = await contextoDaPagina();
  const [dados, atualizado, plano] = await Promise.all([dadosDaPagina(pagina), atualizadoEm().catch(() => null), planoDaPagina(ctx)]);
  return <PaginaLicitacoes pagina={pagina} {...dados} atualizadoEm={atualizado} plano={plano} />;
}
