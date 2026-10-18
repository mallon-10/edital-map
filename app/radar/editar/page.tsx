import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormRadar } from '@/components/radar/FormRadar';
import { rascunhoDoRadar } from '@/lib/radar';
import { lerRadar } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Editar meu radar', robots: { index: false, follow: false } };

/** As três etapas do onboarding numa página só, preenchidas com o radar salvo. */
export default async function EditarRadar() {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/radar/editar');
  const radar = await lerRadar(usuario);
  if (!radar) redirect('/radar/comecar');
  const cidades = await municipiosPorIbge(radar.municipios);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        <FormRadar modo="editar" inicial={rascunhoDoRadar(radar, cidades)} />
      </main>
    </>
  );
}
