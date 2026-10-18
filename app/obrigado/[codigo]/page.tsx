import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ChaveAcesso } from '@/components/pagamento/ChaveAcesso';
import { EsperaPagamento } from '@/components/pagamento/EsperaPagamento';
import { data } from '@/lib/formato';
import { estadoDoCheckout, type EstadoCheckout } from '@/lib/servidor/pagamento';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = { title: 'Pagamento', robots: { index: false, follow: false } };

type Props = { params: Promise<{ codigo: string }> };

const NOME = { basic: 'Basic', pro: 'Pro' } as const;

/** Volta da Cakto (/obrigado/{{callback}}): confirma o plano neste navegador e mostra a chave de acesso. */
export default async function Obrigado({ params }: Props) {
  await connection();
  const { codigo } = await params;
  const ctx = await contextoDaPagina();
  const estado: EstadoCheckout = await estadoDoCheckout(codigo, ctx?.visitante ?? null).catch((erro: unknown) => {
    console.error('obrigado:', erro);
    return { estado: 'esperando' } as const;
  });
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-10 text-[15px] leading-relaxed md:px-6">
        {estado.estado === 'pago' ? (
          <>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Plano {NOME[estado.plano]} ativo</h1>
            <p>
              Obrigado! O plano {NOME[estado.plano]} {estado.periodo === 'anual' ? 'anual' : 'mensal'} já está valendo
              {estado.chave ? ' neste navegador' : ''}, até {data(estado.validoAte)} (renova sozinho).
            </p>
            {estado.chave ? (
              <ChaveAcesso chave={estado.chave} />
            ) : (
              <p className="text-ink-muted">
                Para usar aqui, abra esta página no navegador onde você clicou em Assinar, ou use sua chave de acesso em{' '}
                <Link href="/assinatura" className="font-semibold text-pin-strong hover:underline">Minha assinatura</Link>.
              </p>
            )}
            <Link href="/" className="inline-flex h-11 items-center self-start rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
              Buscar editais
            </Link>
          </>
        ) : estado.estado === 'esperando' ? (
          <>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Recebemos seu pedido</h1>
            <EsperaPagamento codigo={codigo} />
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Pagamento</h1>
            <p>
              Não encontramos este pedido neste navegador. Abra esta página no navegador onde você clicou em Assinar, ou use sua chave de
              acesso em <Link href="/assinatura" className="font-semibold text-pin-strong hover:underline">Minha assinatura</Link>.
            </p>
          </>
        )}
      </main>
    </>
  );
}
