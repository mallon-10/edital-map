import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { EsperaPagamento } from '@/components/pagamento/EsperaPagamento';
import { data } from '@/lib/formato';
import { estadoDoCheckout, type EstadoCheckout } from '@/lib/servidor/pagamento';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = { title: 'Pagamento', robots: { index: false, follow: false } };

type Props = { params: Promise<{ codigo: string }> };

const TITULO = 'text-[28px] font-bold leading-tight tracking-[-0.015em]';

/** Depois do pagamento: confirma o Pro e leva a ativar a conta (código no e-mail da compra) e configurar o Radar. */
export default async function Obrigado({ params }: Props) {
  await connection();
  const { codigo } = await params;
  const ctx = await contextoDaPagina();
  const estado: EstadoCheckout = await estadoDoCheckout(codigo, ctx?.visitante ?? null).catch((erro: unknown) => {
    console.error('obrigado:', erro);
    return { estado: 'esperando' } as const;
  });
  const entrar = estado.estado === 'pago' && estado.email
    ? `/entrar?email=${encodeURIComponent(estado.email)}&voltar=${encodeURIComponent('/radar/comecar')}`
    : `/entrar?voltar=${encodeURIComponent('/radar/comecar')}`;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-10 text-[15px] leading-relaxed md:px-6">
        {estado.estado === 'pago' ? (
          <>
            <h1 className={TITULO}>Pro ativo</h1>
            <p>
              Obrigado! O Pro {estado.periodo === 'anual' ? 'anual' : 'mensal'} já está valendo neste navegador, até {data(estado.validoAte)}, e
              renova sozinho.
            </p>
            <section className="flex flex-col gap-3 rounded-lg border border-pin bg-pin-soft p-5">
              <h2 className="text-[17px] font-bold">Ative sua conta para receber o resumo de segunda</h2>
              <p className="text-[14px] text-ink-muted">
                Enviamos um código para {estado.email ? <strong className="break-all text-ink">{estado.email}</strong> : 'o e-mail da compra'} quando
                você pedir. Com a conta, o Pro vale em qualquer aparelho e você escolhe o segmento do seu resumo semanal.
              </p>
              <Link href={entrar} prefetch={false} className="inline-flex h-11 items-center self-start rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
                Ativar minha conta
              </Link>
            </section>
            <Link href="/" className="text-sm font-semibold text-pin-strong hover:underline">
              Ou buscar editais agora
            </Link>
          </>
        ) : estado.estado === 'esperando' ? (
          <>
            <h1 className={TITULO}>Recebemos seu pedido</h1>
            <EsperaPagamento codigo={codigo} />
          </>
        ) : (
          <>
            <h1 className={TITULO}>Pagamento</h1>
            <p>
              Não encontramos este pedido. Se você já assinou, entre com o e-mail da compra em{' '}
              <Link href="/entrar" prefetch={false} className="font-semibold text-pin-strong hover:underline">
                Entrar
              </Link>{' '}
              e o Pro aparece.
            </p>
          </>
        )}
      </main>
    </>
  );
}
