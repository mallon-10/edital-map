import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { TriagemAssessoria } from '@/components/assessoria/TriagemAssessoria';
import { IconeCheck, IconeFechar } from '@/components/inicio/Icones';
import {
  ENTREGAVEIS_ASSESSORIA, LIMITES_ASSESSORIA, mostrarAssessoria, NOME_ASSESSORIA, numeroWhatsapp, PRECO_ASSESSORIA, type EditalAssessoria,
} from '@/lib/assessoria';
import { SLUG_EDITAL } from '@/lib/eventos';
import { OPEN_GRAPH_BASE } from '@/lib/seo/site';
import { edital } from '@/lib/servidor/consultas';
import { planoDaPagina } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { assunto, nomeProprio } from '@/lib/texto';

type Props = { searchParams: Promise<{ edital?: string | string[] }> };

const TITULO = 'Assessoria para participar de licitações';
const DESCRICAO = `Encontrou uma licitação e não sabe como participar? Entenda o edital, os documentos exigidos e os próximos passos. A partir de ${PRECO_ASSESSORIA}.`;

const slugValido = (v: string | string[] | undefined) => (typeof v === 'string' && SLUG_EDITAL.test(v) ? v : null);

/** Com um edital no endereço a página é a triagem dele: fora do Google, que indexa só /assessoria. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const comEdital = (await searchParams).edital !== undefined;
  return {
    title: TITULO,
    description: DESCRICAO,
    alternates: { canonical: '/assessoria' },
    openGraph: { ...OPEN_GRAPH_BASE, title: TITULO, description: DESCRICAO, url: '/assessoria' },
    robots: comEdital ? { index: false, follow: true } : undefined,
  };
}

/** Edital do endereço, lido do banco: só o slug vem de fora, e edital fechado não vira pedido de orientação. */
async function editalDaTriagem(slug: string | null): Promise<EditalAssessoria | null> {
  const e = slug ? await edital(slug).catch(() => null) : null;
  if (!e || !mostrarAssessoria(e, new Date())) return null;
  return {
    slug: e.slug,
    titulo: assunto(e.objeto).titulo,
    orgao: nomeProprio(e.orgao_nome),
    local: `${e.municipio_nome ?? '—'}/${e.uf}`,
    encerramento_em: e.encerramento_em,
  };
}

/** Assessoria Edital Map: serviço avulso, separado do Pro. O que entrega, o que não entrega e a triagem antes do WhatsApp. */
export default async function PaginaAssessoria({ searchParams }: Props) {
  await connection();
  const [doEdital, plano] = await Promise.all([
    editalDaTriagem(slugValido((await searchParams).edital)),
    contextoDaPagina().then((ctx) => planoDaPagina(ctx)),
  ]);
  return (
    <>
      <Cabecalho plano={plano} semOferta />
      <main className="mx-auto grid w-full max-w-[1080px] items-start gap-5 px-4 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-6 lg:px-6">
        <section aria-labelledby="titulo-assessoria" className="flex flex-col gap-3 rounded-[26px] bg-mata-soft p-5 lg:rounded-[28px] lg:p-8">
          <p className="inline-flex h-[26px] items-center self-start rounded-full bg-raised px-2.5 text-xs font-semibold text-mata">{NOME_ASSESSORIA}</p>
          <h1 id="titulo-assessoria" className="text-balance text-[28px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[38px]">
            Encontrou uma licitação e não sabe como participar?
          </h1>
          <p className="text-pretty text-[16.5px] text-ink-muted">Ajudamos sua empresa a entender o edital, identificar os documentos necessários e organizar os próximos passos.</p>
          <p className="text-[18px] font-bold">A partir de {PRECO_ASSESSORIA}</p>
          <p className="text-pretty text-[14px] text-ink-muted">Escopo e preço definitivo são confirmados antes da contratação, conforme o edital e o prazo. Serviço separado da assinatura Pro.</p>
        </section>

        <div className="lg:sticky lg:top-4 lg:row-span-2">
          <TriagemAssessoria numero={numeroWhatsapp(process.env.WHATSAPP_ASSESSORIA)} edital={doEdital} />
        </div>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="inclui" className="rounded-[22px] bg-raised p-5 lg:p-6">
            <h2 id="inclui" className="mb-3 text-[18px] font-semibold">O que entregamos</h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]">
              {ENTREGAVEIS_ASSESSORIA.map((i) => (
                <li key={i} className="grid grid-cols-[20px_1fr] gap-2.5">
                  <IconeCheck className="mt-px size-5 text-mata" />
                  {i}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="nao-inclui" className="rounded-[22px] bg-raised p-5 lg:p-6">
            <h2 id="nao-inclui" className="mb-3 text-[18px] font-semibold">O que não está incluído</h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] text-ink-muted">
              {LIMITES_ASSESSORIA.map((i) => (
                <li key={i} className="grid grid-cols-[20px_1fr] gap-2.5">
                  <IconeFechar className="mt-px size-5" />
                  {i}
                </li>
              ))}
            </ul>
          </section>
          <p className="rounded-[18px] bg-sunken p-4 text-[13px] text-ink-muted">
            Quer só acompanhar novos editais? Isso é o{' '}
            <Link href="/planos" prefetch={false} className="font-semibold text-pin-strong hover:underline">
              Edital Map Pro
            </Link>
            . A busca continua grátis e sem limite.
          </p>
        </div>
      </main>
    </>
  );
}
