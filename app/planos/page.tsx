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
  description: 'Planos do Edital Map: grátis com 3 buscas por dia ou Pro por R$ 37,90/mês, sem limites e com o resumo semanal do seu segmento.',
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
            Comece grátis. Quando precisar de mais buscas e editais por dia, do edital oficial, de filtros por raio e órgão e do resumo semanal do seu segmento, assine o Pro.
          </p>
        </div>
        {PLANOS.filter((p) => p.id !== 'gratis').map((p) => (
          <span key={p.id} id={p.id} aria-hidden="true" className="-mb-6 block h-0 scroll-mt-24" />
        ))}
        <PlanosVista pagamento={pagamento} atual={atual} />
        {pagamento ? (
          <div className="flex flex-col gap-1 rounded-md bg-sunken p-4 text-[13px] text-ink-muted">
            <p>Pagamento por Pix Automático ou cartão, aqui mesmo no site (processado pela Cakto). Renova sozinho; cancele quando quiser. Pro: uso justo, sem teto na tela.</p>
            <p>
              Já assinou?{' '}
              <Link href="/entrar?voltar=/assinatura" prefetch={false} className="font-semibold text-pin-strong hover:underline">
                Entre com o e-mail da compra
              </Link>{' '}
              e o Pro vale em qualquer aparelho.
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">{AVISO_PLANOS}</p>
        )}
      </main>
    </>
  );
}
