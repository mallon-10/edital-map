import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { CartaoRecursoPlano } from '@/components/conta/CartaoRecursoPlano';
import { LinhaOportunidade } from '@/components/oportunidades/LinhaOportunidade';
import { numero } from '@/lib/formato';
import { avisoPlanoNavegador, LIMITES_CONTA, MENSAGENS_LIMITE_CONTA, planoIncerto } from '@/lib/limitesConta';
import { contarPorStatus, FILTROS_STATUS, lerNavegacaoSalvos, ROTULO_FILTRO, salvosDaAba, TEXTO_STATUS_PESSOAL, urlDosSalvos } from '@/lib/salvos';
import { planoDaConta } from '@/lib/servidor/conta';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { salvosDaConta } from '@/lib/servidor/salvos';
import { usuarioAtual } from '@/lib/servidor/sessao';
import { paraUrlSearchParams } from '@/lib/urlBusca';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Minhas Oportunidades', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ABA = 'inline-flex h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold hover:bg-sunken aria-[current=page]:bg-pin-soft aria-[current=page]:text-pin-strong';

/**
 * Minhas Oportunidades: os editais salvos da conta, por aba de status (com contagem) e ordem (prazo ou data em que
 * salvou). "Todos" não mostra os descartados (só a aba deles). Os status são da pessoa, não a situação oficial.
 * Grátis sem salvos vê só o convite ao Pro (no lugar da lista); grátis com salvos antigos (Pro vencido) vê o convite e
 * a lista, e ainda pode remover. Plano não confirmado (consulta falhou): pede para tentar de novo em vez do convite.
 */
export default async function MinhasOportunidades({ searchParams }: Props) {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/oportunidades');
  const nav = lerNavegacaoSalvos(paraUrlSearchParams(await searchParams));
  const [lista, plano] = await Promise.all([salvosDaConta(usuario), planoDaConta(usuario, await contextoDaPagina())]);
  const contagem = contarPorStatus(lista.map((s) => s.status));
  const visiveis = salvosDaAba(lista, nav);
  const agora = new Date().toISOString();
  const aviso = avisoPlanoNavegador(plano);
  const gratis = LIMITES_CONTA[plano.plano].salvos === 0;
  const incerto = planoIncerto(plano);

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Minhas Oportunidades</h1>
          <p className="text-sm text-ink-muted">Os editais que você salvou, com o seu status e as suas observações.</p>
          <p className="text-[13px] text-ink-muted">{TEXTO_STATUS_PESSOAL}</p>
        </div>
        {aviso ? (
          <p role="note" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] text-pin-strong">
            {aviso}
          </p>
        ) : null}
        {incerto ? (
          <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] font-semibold text-pin-strong">
            {MENSAGENS_LIMITE_CONTA.planoIndisponivel}
          </p>
        ) : gratis ? (
          <CartaoRecursoPlano titulo={MENSAGENS_LIMITE_CONTA.salvosPlano} texto={MENSAGENS_LIMITE_CONTA.salvosConvite} />
        ) : null}
        {gratis && lista.length === 0 ? null : (
          <>
            <nav aria-label="Filtrar por status" className="flex flex-wrap gap-1 border-b border-line pb-2">
              {FILTROS_STATUS.map((f) => (
                <Link key={f} href={urlDosSalvos({ ...nav, status: f })} prefetch={false} aria-current={nav.status === f ? 'page' : undefined} className={ABA}>
                  {ROTULO_FILTRO[f]}
                  <span className="font-mono text-xs">{numero(contagem[f])}</span>
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-muted">Ordenar por</span>
              <Link href={urlDosSalvos({ ...nav, ordem: 'prazo' })} prefetch={false} aria-current={nav.ordem === 'prazo' ? 'page' : undefined} className={ABA}>
                Prazo
              </Link>
              <Link href={urlDosSalvos({ ...nav, ordem: 'salvo' })} prefetch={false} aria-current={nav.ordem === 'salvo' ? 'page' : undefined} className={ABA}>
                Data em que salvei
              </Link>
            </div>
            {visiveis.length === 0 ? (
              <section className="flex flex-col gap-2 rounded-md border border-line bg-raised p-5">
                <h2 className="text-[17px] font-bold">Nenhum edital nesta aba.</h2>
                <p className="text-[15px] text-ink-muted">Toque no ícone de salvar nos cards da busca, do Meu Radar ou na página do edital.</p>
                <Link href="/" prefetch={false} className="inline-flex h-11 w-fit items-center text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
                  Buscar editais
                </Link>
              </section>
            ) : (
              <section aria-label="Editais salvos" className="flex flex-col gap-3">
                {visiveis.map((s) => (
                  <LinhaOportunidade key={s.id} salvo={s} agora={agora} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
