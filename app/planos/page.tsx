import type { Metadata } from 'next';
import { Cabecalho } from '@/components/Cabecalho';
import { PlanosVista } from '@/components/planos/PlanosVista';
import { AVISO_PLANOS, PLANOS } from '@/lib/planos';

export const metadata: Metadata = {
  title: 'Planos',
  description: 'Planos do Edital Map: grátis com 3 buscas por dia, Basic e Pro para buscar e abrir mais editais por dia.',
  alternates: { canonical: '/planos' },
};

export default function PaginaPlanos() {
  return (
    <>
      <Cabecalho />
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
        <PlanosVista />
        <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">{AVISO_PLANOS}</p>
      </main>
    </>
  );
}
