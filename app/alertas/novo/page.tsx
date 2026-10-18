import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormAlerta } from '@/components/alertas/FormAlerta';
import { CartaoRecursoPlano } from '@/components/conta/CartaoRecursoPlano';
import { bloqueioAlerta, MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import { rascunhoDoRadar } from '@/lib/radar';
import { contarAlertas } from '@/lib/servidor/alertas';
import { lerRadar, planoDaConta } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Criar alerta', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ de?: string | string[] }> };

/** Criar alerta (vazio ou, com ?de=radar, preenchido com o Meu Radar). Sem plano ou no limite: o convite ou o aviso. */
export default async function NovoAlerta({ searchParams }: Props) {
  await connection();
  const doRadar = (await searchParams).de === 'radar';
  const usuario = await usuarioAtual();
  if (!usuario) redirect(doRadar ? '/entrar?voltar=%2Falertas%2Fnovo%3Fde%3Dradar' : '/entrar?voltar=/alertas/novo');
  const [plano, qtd, radar] = await Promise.all([planoDaConta(usuario, await contextoDaPagina()), contarAlertas(usuario), doRadar ? lerRadar(usuario) : Promise.resolve(null)]);
  const bloqueio = bloqueioAlerta(plano.plano, qtd);
  const cidades = radar ? await municipiosPorIbge(radar.municipios) : [];
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        {bloqueio?.codigo === 'plano' ? (
          <CartaoRecursoPlano titulo={MENSAGENS_LIMITE_CONTA.alertasPlano} texto={MENSAGENS_LIMITE_CONTA.alertasConvite} />
        ) : bloqueio ? (
          <section className="flex flex-col gap-3">
            <p className="text-[15px]">{bloqueio.mensagem}</p>
            <Link href="/alertas" prefetch={false} className="w-fit text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
              Voltar aos alertas
            </Link>
          </section>
        ) : (
          <FormAlerta modo="novo" nomeInicial={radar ? 'Meu radar' : ''} inicial={rascunhoDoRadar(radar, cidades)} origem={radar ? 'radar' : 'manual'} />
        )}
      </main>
    </>
  );
}
