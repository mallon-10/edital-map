import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { PlanosVista } from '@/components/planos/PlanosVista';
import { AVISO_PLANOS, PLANOS } from '@/lib/planos';
import { pagamentoLigado, planoAtual } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usoDoDia } from '@/lib/servidor/uso';

export const metadata: Metadata = {
  title: 'Planos',
  description: 'Planos do Edital Map: grátis com 3 buscas por dia, Basic e Pro para buscar e abrir mais editais por dia.',
  alternates: { canonical: '/planos' },
};

export default async function PaginaPlanos() {
  await connection();
  const ctx = await contextoDaPagina();
  const pagamento = pagamentoLigado();
  const [atual, uso] = await Promise.all([planoAtual(ctx), usoDoDia(ctx)]);
  return (
    <>
      <Cabecalho uso={uso} />
      <main className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Planos</h1>
          <p className="text-[15px] text-ink-muted">
            Comece grátis. Quando precisar de mais buscas e editais por dia, de alertas e de editais salvos, escolha o Basic ou o Pro.
          </p>
        </div>
        {PLANOS.filter((p) => p.id !== 'gratis').map((p) => (
          <span key={p.id} id={p.id} aria-hidden="true" className="-mb-6 block h-0 scroll-mt-24" />
        ))}
        <PlanosVista pagamento={pagamento} atual={atual} />
        {pagamento ? (
          <div className="flex flex-col gap-1 rounded-md bg-sunken p-4 text-[13px] text-ink-muted">
            <p>Pagamento por cartão ou Pix pela Cakto. Renova sozinho; cancele quando quiser pelo e-mail da compra. Pro: uso justo, sem teto na tela.</p>
            <p>
              Já assinou?{' '}
              <Link href="/assinatura" prefetch={false} className="font-semibold text-pin-strong hover:underline">
                Use sua chave de acesso
              </Link>
              .
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">{AVISO_PLANOS}</p>
        )}
      </main>
    </>
  );
}
