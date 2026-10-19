import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { data } from '@/lib/formato';
import { assinaturaDoEmail, assinaturaDoVisitante, type AssinaturaVisivel } from '@/lib/servidor/pagamento';
import { planoDaPagina } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

export const metadata: Metadata = { title: 'Minha assinatura', robots: { index: false, follow: false } };

/** Plano deste navegador ou da conta logada; para outro aparelho, entrar com o e-mail da compra. */
export default async function MinhaAssinatura() {
  await connection();
  const ctx = await contextoDaPagina();
  const [doNavegador, usuario, plano] = await Promise.all([
    ctx ? assinaturaDoVisitante(ctx.visitante).catch(() => null) : Promise.resolve(null),
    usuarioAtual(),
    planoDaPagina(ctx),
  ]);
  const assinatura: AssinaturaVisivel | null =
    doNavegador ?? (usuario?.email ? await assinaturaDoEmail(usuario.email).catch(() => null) : null);
  return (
    <>
      <Cabecalho plano={plano} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-10 text-[15px] leading-relaxed md:px-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Minha assinatura</h1>
        {assinatura ? (
          <>
            <section className="flex flex-col gap-1 rounded-lg border border-line bg-raised p-5">
              <span className="text-[17px] font-bold">Plano Pro {assinatura.periodo === 'anual' ? 'anual' : 'mensal'}</span>
              <span className="text-ink-muted">
                {assinatura.status === 'cancelada'
                  ? `Cancelada: não renova, vale até ${data(assinatura.validoAte)}.`
                  : `Ativa, renova sozinha. Válida até ${data(assinatura.validoAte)}.`}
              </span>
              {assinatura.email ? <span className="break-all text-[13px] text-ink-muted">E-mail da compra: {assinatura.email}</span> : null}
            </section>
            {usuario ? null : (
              <p>
                Para usar o Pro em outro aparelho,{' '}
                <Link href="/entrar" prefetch={false} className="font-semibold text-pin-strong hover:underline">
                  entre com o e-mail da compra
                </Link>
                .
              </p>
            )}
            <p className="text-[13px] text-ink-muted">
              Para cancelar ou trocar a forma de pagamento, use o link do e-mail da Cakto ou escreva para{' '}
              <a href="mailto:mallon@escalav.com.br" className="font-semibold text-pin-strong hover:underline">
                mallon@escalav.com.br
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p>
              {usuario
                ? `A conta ${usuario.email} não tem uma assinatura Pro ativa.`
                : 'Este navegador não tem o Pro. Se você já assinou, entre com o e-mail da compra.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {usuario ? null : (
                <Link href="/entrar?voltar=/assinatura" prefetch={false} className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken">
                  Entrar
                </Link>
              )}
              <Link href="/assinar" prefetch={false} className="inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin">
                Assinar o Pro
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
