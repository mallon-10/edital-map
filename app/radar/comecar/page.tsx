import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { after, connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormRadar } from '@/components/radar/FormRadar';
import { rascunhoDoRadar } from '@/lib/radar';
import { lerRadar } from '@/lib/servidor/conta';
import { contextoDaPagina, gravarEventoUmaVez } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Montar meu radar', robots: { index: false, follow: false } };

/** Onboarding (primeiro acesso de uma conta sem radar). Sem sessão → /entrar (e volta para cá); com radar → Meu Radar. */
export default async function ComecarRadar() {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/entrar?voltar=/radar/comecar');
  if (await lerRadar(usuario)) redirect('/radar');
  const ctx = await contextoDaPagina();
  // Uma vez por visitante: recarregar ou voltar a esta página não conta outro início de onboarding.
  if (ctx) after(() => gravarEventoUmaVez(ctx, 'onboarding_iniciado', {}).catch((erro) => console.error('onboarding_iniciado:', erro)));
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-8">
        <FormRadar modo="comecar" inicial={rascunhoDoRadar(null, [])} />
      </main>
    </>
  );
}
