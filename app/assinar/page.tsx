import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { CabecalhoCheckout } from '@/components/pagamento/CabecalhoCheckout';
import { CheckoutPro } from '@/components/pagamento/CheckoutPro';
import { configPagamento } from '@/lib/pagamento/config';
import { planoAtual } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = { title: 'Assinar o Pro', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ periodo?: string }> };

/** Checkout próprio do Pro (Pix Automático ou cartão). Pagamento desligado: volta a /planos; já Pro: Minha assinatura. */
export default async function Assinar({ searchParams }: Props) {
  await connection();
  const cfg = configPagamento();
  if (!cfg) redirect('/planos');
  const ctx = await contextoDaPagina();
  if ((await planoAtual(ctx)) === 'pro') redirect('/assinatura');
  const { periodo } = await searchParams;
  return (
    <>
      <CabecalhoCheckout />
      <main className="mx-auto w-full max-w-[1128px] px-4 pb-10 pt-1 lg:px-6 lg:pb-[72px]">
        <CheckoutPro clienteId={cfg.clienteId} periodoInicial={periodo === 'anual' ? 'anual' : 'mensal'} />
      </main>
    </>
  );
}
