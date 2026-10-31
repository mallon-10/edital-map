import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormAlerta } from '@/components/alertas/FormAlerta';
import { PaginaBloqueada } from '@/components/conta/PaginaBloqueada';
import { previaTemFiltro, rascunhoDaBusca } from '@/lib/alertaDaBusca';
import { bloqueioAlerta } from '@/lib/limitesConta';
import { rascunhoDoRadar } from '@/lib/radar';
import { acessoAoPro } from '@/lib/servidor/acessoPro';
import { contarAlertas } from '@/lib/servidor/alertas';
import { lerRadar, planoDaConta } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { municipioPorIbge } from '@/lib/servidor/nomes';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';
import { lerBuscaDaUrl, montarTela, paraUrlSearchParams } from '@/lib/urlBusca';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Criar alerta', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Filtros que vieram no endereço (da busca ou de um edital), com a mesma validação da página inicial. */
async function filtrosDoEndereco(p: URLSearchParams) {
  const { busca } = lerBuscaDaUrl(p);
  const cidade = busca.ibge ? await municipioPorIbge(busca.ibge).catch(() => null) : null;
  return rascunhoDaBusca(montarTela(busca, cidade, null));
}

/**
 * Criar alerta (vazio; com ?de=radar, preenchido com o Meu Radar; com os filtros de uma busca ou edital, preenchido com
 * eles). Só Pro: o grátis vê a vitrine, com a prévia desses filtros. No limite, o aviso.
 */
export default async function NovoAlerta({ searchParams }: Props) {
  await connection();
  const endereco = paraUrlSearchParams(await searchParams);
  const doRadar = endereco.get('de') === 'radar';
  const daBusca = previaTemFiltro(endereco) ? await filtrosDoEndereco(endereco) : null;
  const destino = `/alertas/novo?${endereco}`;
  const usuario = await usuarioAtual();
  const ctx = await contextoDaPagina();
  const acesso = await acessoAoPro(usuario, ctx);
  if (acesso !== 'liberado') {
    return <PaginaBloqueada recurso="alertas" logado={usuario !== null} incerto={acesso === 'incerto'} previa={daBusca} voltar={daBusca ? destino : undefined} busca={daBusca ? `/?${endereco}` : undefined} />;
  }
  if (!usuario) redirect(doRadar || daBusca ? `/entrar?voltar=${encodeURIComponent(destino)}` : '/entrar?voltar=/alertas/novo');
  const [plano, qtd, radar] = await Promise.all([planoDaConta(usuario, ctx), contarAlertas(usuario), doRadar ? lerRadar(usuario) : Promise.resolve(null)]);
  const bloqueio = bloqueioAlerta(plano.plano, qtd);
  const cidades = radar ? await municipiosPorIbge(radar.municipios) : [];
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        {bloqueio ? (
          <section className="flex flex-col gap-3">
            <p className="text-[15px]">{bloqueio.mensagem}</p>
            <Link href="/alertas" prefetch={false} className="w-fit text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
              Voltar aos alertas
            </Link>
          </section>
        ) : (
          <FormAlerta modo="novo" nomeInicial={radar ? 'Meu radar' : ''} inicial={daBusca && !radar ? daBusca : rascunhoDoRadar(radar, cidades)} origem={radar ? 'radar' : 'manual'} />
        )}
      </main>
    </>
  );
}
