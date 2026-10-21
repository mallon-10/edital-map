import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cartao, ListaBarras, Numero, SerieDiaria } from '@/components/admin/Blocos';
import { diasCompletos, intervaloDoPeriodo, nomeDaPagina, nomeDoRecurso, PERIODOS, taxa } from '@/lib/admin';
import { numero } from '@/lib/formato';
import { NOMES_ORIGEM, type Origem } from '@/lib/paginaVista';
import { url as urlDoSite } from '@/lib/seo/site';
import { assunto } from '@/lib/texto';
import { lerPainel } from '@/lib/servidor/admin';

export const metadata: Metadata = { title: 'Painel', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ periodo?: string }> };

const nomeOrigem = (o: string) => NOMES_ORIGEM[o as Origem] ?? o;
const buscaDe = (termo: string) => urlDoSite(`/?q=${encodeURIComponent(termo)}`);
const contar = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`;

/**
 * Painel do dono (spec 2026-10-20-painel-admin-design.md), só no computador dele: `npm run admin` e
 * http://127.0.0.1:3100/admin. No site publicado a rota não existe (page.local.tsx, lib/paginasLocais.ts).
 * Links de termos e editais abrem o site publicado, para a navegação local não entrar nas métricas.
 */
export default async function PaginaAdmin({ searchParams }: Props) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { periodo: valor } = await searchParams;
  const { periodo, desde, ate } = intervaloDoPeriodo(valor, new Date());
  const p = await lerPainel(desde, ate);
  const r = p.resumo;
  const f = p.funil;
  const passos = [
    { rotulo: 'Visitaram', n: f.visitou },
    { rotulo: 'Buscaram', n: f.buscou },
    { rotulo: 'Abriram um edital', n: f.abriu_edital },
    { rotulo: 'Viram os planos', n: f.viu_planos },
    { rotulo: 'Tentaram assinar', n: f.tentou_assinar },
    { rotulo: 'Assinaram', n: f.assinou },
  ];

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Painel</h1>
          <p className="text-[13px] text-ink-muted">
            Sem as suas visitas (navegadores internos). Páginas vistas, origem e resultado da busca são medidos desde 20/10/2026.
          </p>
        </div>
        <nav aria-label="Período" className="flex gap-1 rounded-sm border border-line bg-raised p-1 text-[13px] font-semibold">
          {PERIODOS.map((x) => (
            <Link
              key={x.valor}
              href={`/admin?periodo=${x.valor}`}
              prefetch={false}
              aria-current={x.valor === periodo ? 'page' : undefined}
              className={`rounded-xs px-3 py-1.5 ${x.valor === periodo ? 'bg-ink text-raised' : 'hover:bg-sunken'}`}
            >
              {x.rotulo}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Numero rotulo="Visitantes" valor={r.visitantes} detalhe={contar(r.visitas, 'entrada', 'entradas')} />
        <Numero rotulo="Páginas vistas" valor={r.paginas} />
        <Numero rotulo="Buscas" valor={r.buscas} detalhe={`${numero(r.buscas_sem_resultado)} sem resultado`} />
        <Numero rotulo="Editais abertos" valor={r.editais} detalhe={`${numero(r.oficial)} no link oficial`} />
        <Numero rotulo="Contas novas" valor={r.contas} detalhe={contar(r.alertas, 'alerta criado', 'alertas criados')} />
        <Numero rotulo="Assinaturas" valor={r.assinaturas} detalhe={contar(r.tentou_assinar, 'tentativa', 'tentativas')} />
      </div>

      <Cartao titulo="Visitantes por dia" nota="Passe o mouse numa barra para ver páginas, buscas e editais do dia.">
        <SerieDiaria dias={diasCompletos(p.por_dia, desde, ate)} />
      </Cartao>

      <div className="grid gap-4 md:grid-cols-2">
        <Cartao titulo="Funil" nota="Visitantes diferentes que fizeram cada coisa no período (não precisa ser em ordem); a porcentagem é sobre quem visitou.">
          <ol className="flex flex-col gap-2 text-[13px]">
            {passos.map((s, i) => (
              <li key={s.rotulo} className="flex items-baseline justify-between gap-3 border-t border-line pt-2 first:border-0 first:pt-0">
                <span>{s.rotulo}</span>
                <span className="tabular-nums">
                  <strong>{numero(s.n)}</strong>
                  {i > 0 && <span className="ml-2 text-ink-muted">{taxa(s.n, f.visitou)}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Cartao>

        <Cartao titulo="De onde vêm as visitas" nota="Só a primeira página de cada visita vinda de fora do site.">
          <ListaBarras itens={p.origens.map((o) => ({ chave: o.nome, rotulo: nomeOrigem(o.nome), n: o.n, extra: taxa(o.n, r.visitas) }))} />
        </Cartao>

        <Cartao titulo="Termos mais buscados" nota="Vezes buscadas · pessoas diferentes · média de editais achados.">
          <ListaBarras
            itens={p.termos.map((t) => ({
              chave: t.termo,
              rotulo: t.termo,
              n: t.n,
              href: buscaDe(t.termo),
              extra: [`${t.pessoas} pess.`, t.media === null ? null : `~${numero(t.media)} achados`, t.zeros ? `${t.zeros}× nada` : null]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
        </Cartao>

        <Cartao titulo="Buscas sem resultado" nota="O que as pessoas procuram e o site não acha: termo novo para lib/relevancia/termos.ts ou assunto que falta.">
          <ListaBarras
            itens={p.sem_resultado.map((t) => ({ chave: t.termo, rotulo: t.termo, n: t.n, href: buscaDe(t.termo), extra: `${t.pessoas} pess.` }))}
            vazio="Nenhuma busca sem resultado no período."
          />
        </Cartao>

        <Cartao titulo="Páginas mais vistas">
          <ListaBarras
            itens={p.paginas.map((x) => ({ chave: x.nome, rotulo: nomeDaPagina(x.nome), n: x.n, extra: `${x.pessoas} pess.`, mono: nomeDaPagina(x.nome) === x.nome }))}
          />
        </Cartao>

        <Cartao titulo="Páginas de entrada" nota="Por onde as visitas chegam ao site.">
          <ListaBarras itens={p.entradas.map((x) => ({ chave: x.nome, rotulo: nomeDaPagina(x.nome), n: x.n, mono: nomeDaPagina(x.nome) === x.nome }))} />
        </Cartao>

        <Cartao titulo="Editais mais abertos">
          <ListaBarras
            itens={p.editais_top.map((e) => ({
              chave: e.slug,
              rotulo: e.objeto ? `${assunto(e.objeto).titulo}${e.uf ? ` · ${e.municipio_nome ? `${e.municipio_nome}/` : ''}${e.uf}` : ''}` : `${e.slug} (já saiu do banco)`,
              n: e.n,
              href: e.objeto ? urlDoSite(`/edital/${e.slug}`) : undefined,
              extra: `${e.pessoas} pess.`,
            }))}
          />
        </Cartao>

        <Cartao titulo="Recursos usados">
          <ListaBarras
            itens={p.recursos.map((x) => ({ chave: `${x.tipo}:${x.nome}`, rotulo: nomeDoRecurso(x.tipo, x.nome), n: x.n, extra: `${x.pessoas} pess.` }))}
          />
        </Cartao>

        <Cartao titulo="UFs nas buscas" nota="Buscas com estado escolhido.">
          <ListaBarras itens={p.ufs.map((u) => ({ chave: u.nome, rotulo: u.nome, n: u.n }))} />
        </Cartao>

        <Cartao titulo="Sites que mandaram visitas" nota="Domínio de quem mandou; campanhas pelo utm_campaign.">
          <ListaBarras itens={p.sites.map((s) => ({ chave: s.nome, rotulo: s.nome, n: s.n, mono: true }))} vazio="Nenhum site no período." />
          {p.campanhas.length > 0 && (
            <>
              <h3 className="pt-2 text-[13px] font-bold">Campanhas</h3>
              <ListaBarras itens={p.campanhas.map((c) => ({ chave: c.nome, rotulo: c.nome, n: c.n, mono: true }))} />
            </>
          )}
        </Cartao>
      </div>
    </main>
  );
}
