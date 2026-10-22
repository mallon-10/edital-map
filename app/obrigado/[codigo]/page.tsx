import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Medir } from '@/components/Medir';
import { CartaoEsperando, CartaoNaoEncontrado, CartaoPago } from '@/components/pagamento/Obrigado';
import { PLANOS } from '@/lib/planos';
import { estadoDoCheckout, type EstadoCheckout } from '@/lib/servidor/pagamento';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = { title: 'Pagamento', robots: { index: false, follow: false } };

type Props = { params: Promise<{ codigo: string }> };

const PRO = PLANOS.find((p) => p.id === 'pro')!;

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
      <main className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-4 lg:px-6 lg:pb-[72px] lg:pt-6">
        {estado.estado === 'pago' ? (
          <>
            {estado.email ? (
              <Medir
                conversao="assinou"
                chave={codigo}
                transacao={codigo}
                email={estado.email}
                valorCentavos={estado.periodo === 'anual' ? PRO.centavosAno : PRO.centavosMes}
              />
            ) : null}
            <CartaoPago periodo={estado.periodo} validoAte={estado.validoAte} email={estado.email} entrar={entrar} />
          </>
        ) : estado.estado === 'esperando' ? (
          <CartaoEsperando codigo={codigo} />
        ) : (
          <CartaoNaoEncontrado />
        )}
      </main>
    </>
  );
}
