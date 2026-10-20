import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { after, connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { PaginaBloqueada } from '@/components/conta/PaginaBloqueada';
import { OnboardingRadar } from '@/components/radar/OnboardingRadar';
import { acessoAoPro } from '@/lib/servidor/acessoPro';
import { lerRadar } from '@/lib/servidor/conta';
import { contextoDaPagina, gravarEventoUmaVez } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Montar meu radar', robots: { index: false, follow: false } };

/**
 * Onboarding numa tela só (primeiro acesso de uma conta sem radar): produtos ou CNPJ e "Criar meu radar". Só Pro: o
 * grátis vê a página bloqueada. Sem sessão → /entrar (e volta para cá); com radar → Meu Radar.
 */
export default async function ComecarRadar() {
  await connection();
  const usuario = await usuarioAtual();
  const ctx = await contextoDaPagina();
  const acesso = await acessoAoPro(usuario, ctx);
  if (acesso !== 'liberado') return <PaginaBloqueada recurso="radar" logado={usuario !== null} incerto={acesso === 'incerto'} />;
  if (!usuario) redirect('/entrar?voltar=/radar/comecar');
  if (await lerRadar(usuario)) redirect('/radar');
  // Uma vez por visitante: recarregar ou voltar a esta página não conta outro início de onboarding.
  if (ctx) after(() => gravarEventoUmaVez(ctx, 'onboarding_iniciado', {}).catch((erro) => console.error('onboarding_iniciado:', erro)));
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-8">
        <OnboardingRadar />
      </main>
    </>
  );
}
