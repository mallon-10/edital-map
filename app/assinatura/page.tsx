import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ChaveAcesso } from '@/components/pagamento/ChaveAcesso';
import { FormChave } from '@/components/pagamento/FormChave';
import { data } from '@/lib/formato';
import { assinaturaDoVisitante } from '@/lib/servidor/pagamento';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usoDoDia } from '@/lib/servidor/uso';

export const metadata: Metadata = { title: 'Minha assinatura', robots: { index: false, follow: false } };

const NOME = { basic: 'Basic', pro: 'Pro' } as const;

/** Plano deste navegador, chave de acesso e o formulário para usar a chave em outro navegador. */
export default async function MinhaAssinatura() {
  await connection();
  const ctx = await contextoDaPagina();
  const [assinatura, uso] = await Promise.all([
    ctx ? assinaturaDoVisitante(ctx.visitante).catch(() => null) : Promise.resolve(null),
    usoDoDia(ctx),
  ]);
  return (
    <>
      <Cabecalho uso={uso} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-10 text-[15px] leading-relaxed md:px-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Minha assinatura</h1>
        {assinatura ? (
          <>
            <section className="flex flex-col gap-1 rounded-lg border border-line bg-raised p-5">
              <span className="text-[17px] font-bold">
                Plano {NOME[assinatura.plano]} {assinatura.periodo === 'anual' ? 'anual' : 'mensal'}
              </span>
              <span className="text-ink-muted">
                {assinatura.status === 'cancelada'
                  ? `Cancelada: não renova, vale até ${data(assinatura.validoAte)}.`
                  : `Ativa, renova sozinha. Válida até ${data(assinatura.validoAte)}.`}
              </span>
            </section>
            <ChaveAcesso chave={assinatura.chave} />
            <p className="text-[13px] text-ink-muted">
              Para cancelar ou trocar o cartão, use o link do e-mail de compra da Cakto. Dúvidas:{' '}
              <a href="mailto:mallon@escalav.com.br" className="font-semibold text-pin-strong hover:underline">
                mallon@escalav.com.br
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p>Este navegador ainda não tem um plano pago. Se você já assinou, use sua chave de acesso:</p>
            <FormChave />
            <p>
              Ainda não assinou?{' '}
              <Link href="/planos" className="font-semibold text-pin-strong hover:underline">
                Veja os planos
              </Link>
              .
            </p>
          </>
        )}
      </main>
    </>
  );
}
