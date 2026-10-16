import type { Metadata } from 'next';
import { Cabecalho } from '@/components/Cabecalho';
import { FormAlerta } from '@/components/FormAlerta';
import { ufsIniciaisAlerta } from '@/lib/eventos';

export const metadata: Metadata = { title: 'Criar alerta' };

type Props = { searchParams: Promise<{ uf?: string }> };

export default async function PaginaAlertas({ searchParams }: Props) {
  const { uf } = await searchParams;
  const iniciais = ufsIniciaisAlerta(uf);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Criar alerta</h1>
          <p className="text-[15px] text-ink-muted">
            Diga o que você vende e onde atende. Quando os alertas estiverem prontos, avisamos por e-mail os editais novos do seu interesse.
          </p>
        </div>
        <FormAlerta ufsIniciais={iniciais} />
      </main>
    </>
  );
}
