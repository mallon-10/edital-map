import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormEntrar } from '@/components/conta/FormEntrar';
import { destinoSeguro } from '@/lib/conta';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página de conta: fora do Google (o sitemap também não a lista). */
export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ voltar?: string | string[] }> };

/** Login por código. Já entrado: segue direto para o destino (?voltar=, ou /radar). */
export default async function Entrar({ searchParams }: Props) {
  await connection();
  const { voltar } = await searchParams;
  const destino = destinoSeguro(typeof voltar === 'string' ? voltar : null);
  if (await usuarioAtual()) redirect(destino);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-4 py-10">
        <FormEntrar destino={destino} />
      </main>
    </>
  );
}
