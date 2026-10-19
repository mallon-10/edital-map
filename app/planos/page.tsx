import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { PlanosVista } from '@/components/planos/PlanosVista';
import { AVISO_PLANOS, PLANOS } from '@/lib/planos';
import { pagamentoLigado, planoDaPagina } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = {
  title: 'Planos',
  description:
    'Planos do Edital Map: buscas e editais grátis e sem limite; o Pro, por R$ 37,90/mês, manda as licitações certas para o seu e-mail com alertas e o resumo semanal.',
  alternates: { canonical: '/planos' },
};

export default async function PaginaPlanos() {
  await connection();
  const ctx = await contextoDaPagina();
  const pagamento = pagamentoLigado();
  const plano = await planoDaPagina(ctx);
  return (
    <>
      <Cabecalho plano={plano} />
      <main className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Planos</h1>
          <p className="text-[17px] font-semibold">Receba as licitações certas no seu e-mail, sem procurar todo dia.</p>
          <p className="text-[15px] text-ink-muted">
            Buscar, abrir editais, filtrar por raio e órgão e exportar são grátis e sem limite. No Pro, o Meu Radar completo, até 5 alertas
            por e-mail às 7h e o resumo semanal do seu segmento chegam até você.
          </p>
        </div>
        {PLANOS.filter((p) => p.id !== 'gratis').map((p) => (
          <span key={p.id} id={p.id} aria-hidden="true" className="-mb-6 block h-0 scroll-mt-24" />
        ))}
        <PlanosVista pagamento={pagamento} atual={plano.plano} />
        {pagamento ? (
          <div className="flex flex-col gap-1 rounded-md bg-sunken p-4 text-[13px] text-ink-muted">
            <p>Pagamento por Pix Automático ou cartão, aqui mesmo no site (processado pela Cakto). Renova sozinho; cancele quando quiser.</p>
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
