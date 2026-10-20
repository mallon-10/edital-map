import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { after, connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { PaginaBloqueada } from '@/components/conta/PaginaBloqueada';
import { CardLista } from '@/components/inicio/CardLista';
import { CartoesRadar } from '@/components/radar/CartoesRadar';
import { OrdemRadar, PaginacaoRadar } from '@/components/radar/NavegacaoRadar';
import { RegistrarVisitaRadar } from '@/components/radar/RegistrarVisitaRadar';
import { ResumoRadar } from '@/components/radar/ResumoRadar';
import { ordemEfetiva, POR_PAGINA } from '@/lib/filtros';
import { desdeDaVisita, lerNavegacaoRadar, urlDoRadar } from '@/lib/radar';
import { lerRadar, perfilDaConta } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { contarPorStatus, idsDescartados } from '@/lib/salvos';
import { contagensDoRadar, editaisDoRadar } from '@/lib/servidor/radar';
import { contextoDaPagina, gravarEvento } from '@/lib/servidor/registro';
import { estadoDosSalvos } from '@/lib/servidor/salvos';
import { acessoAoPro } from '@/lib/servidor/acessoPro';
import { usuarioAtual } from '@/lib/servidor/sessao';
import { paraUrlSearchParams } from '@/lib/urlBusca';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Meu Radar', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Meu Radar: cartões com contagens reais, o perfil e a lista personalizada (mesmos cards, ordens e páginas da busca).
 * Só Pro (e o dono): o grátis, com ou sem conta, vê a página bloqueada. Exige conta; sem radar, onboarding.
 */
export default async function MeuRadar({ searchParams }: Props) {
  await connection();
  const usuario = await usuarioAtual();
  const ctx = await contextoDaPagina();
  const acesso = await acessoAoPro(usuario, ctx);
  if (acesso !== 'liberado') return <PaginaBloqueada recurso="radar" logado={usuario !== null} incerto={acesso === 'incerto'} />;
  if (!usuario) redirect('/entrar?voltar=/radar');
  const [radar, perfil, salvos] = await Promise.all([
    lerRadar(usuario),
    perfilDaConta(usuario),
    // Salvos fora do ar não derrubam o radar: a lista sai com os descartados e sem o cartão "Editais salvos".
    estadoDosSalvos(usuario).catch((erro: unknown) => {
      console.error('salvos no radar:', erro);
      return null;
    }),
  ]);
  if (!radar) redirect('/radar/comecar');

  const nav = lerNavegacaoRadar(paraUrlSearchParams(await searchParams));
  // Só o Pro (ou o dono) chega aqui.
  const plano = 'pro';
  const agora = new Date();
  const { desde, primeira } = desdeDaVisita(perfil.ultimaVisitaRadar, agora);
  // Descartados somem do radar (lista, total e cartões); ficam na aba Descartados de Minhas Oportunidades.
  const descartados = salvos ? idsDescartados(salvos) : [];
  const [contagens, lista, cidades] = await Promise.all([
    contagensDoRadar(radar, desde, descartados),
    editaisDoRadar(radar, { ordem: nav.ordem, pagina: nav.pagina, limite: POR_PAGINA }, descartados),
    municipiosPorIbge(radar.municipios),
  ]);
  // Página além do fim (endereço antigo ou digitado): o total vem das linhas, então volta para a primeira.
  if (lista.editais.length === 0 && nav.pagina > 1) redirect(urlDoRadar({ ordem: nav.ordem, pagina: 1 }));
  const ordem = ordemEfetiva(nav.ordem, true);
  // Uma vez por chegada ao radar (não a cada troca de ordem ou página).
  if (ctx && nav.pagina === 1 && nav.ordem === null) {
    after(() =>
      gravarEvento(ctx, 'radar_visto', { total: contagens.total, novas: contagens.novas, plano }).catch((erro) =>
        console.error('radar_visto:', erro),
      ),
    );
  }

  return (
    <>
      <Cabecalho plano={{ plano, dono: Boolean(ctx?.dono) }} />
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Meu Radar</h1>
            <p className="text-sm text-ink-muted">Editais abertos para o que sua empresa vende, atualizados a cada 3 horas.</p>
          </div>
          <Link href="/radar/editar" prefetch={false} className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken">
            Editar meu radar
          </Link>
        </div>
        <ResumoRadar radar={radar} cidades={cidades} />
        <CartoesRadar
          contagens={contagens}
          primeiraVisita={primeira}
          salvos={salvos ? contarPorStatus(Object.values(salvos).map((s) => s.status)) : undefined}
        />
        {lista.total === 0 ? (
          <section className="flex flex-col gap-2 rounded-md border border-line bg-raised p-5">
            <h2 className="text-[17px] font-bold">Nenhum edital aberto para o seu radar agora.</h2>
            <p className="text-[15px] text-ink-muted">Novos editais entram a cada 3 horas. Você também pode ampliar o radar com mais produtos ou outra área.</p>
            <Link href="/radar/editar" prefetch={false} className="inline-flex h-11 w-fit items-center text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
              Editar meu radar
            </Link>
          </section>
        ) : (
          <section aria-label="Oportunidades do seu radar" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold">Oportunidades para o seu perfil</h2>
              <OrdemRadar ordem={ordem} />
            </div>
            {lista.editais.map((e) => (
              <CardLista key={e.id} edital={e} agora={agora} acoes="radar" />
            ))}
            <PaginacaoRadar ordem={ordem} pagina={nav.pagina} total={lista.total} />
          </section>
        )}
        <RegistrarVisitaRadar />
      </main>
    </>
  );
}
