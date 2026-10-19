import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
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
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em] md:text-[32px]">Assinar o Pro</h1>
          <p className="text-[15px] text-ink-muted">
            Receba as licitações certas no seu e-mail, sem procurar todo dia: o Meu Radar completo, até 5 alertas por e-mail às 7h e o
            resumo semanal do seu segmento.{' '}
            <Link href="/planos" prefetch={false} className="font-semibold text-pin-strong hover:underline">
              Comparar planos
            </Link>
          </p>
        </div>
        <CheckoutPro clienteId={cfg.clienteId} periodoInicial={periodo === 'anual' ? 'anual' : 'mensal'} />
      </main>
    </>
  );
}
