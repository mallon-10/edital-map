import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormEntrar } from '@/components/conta/FormEntrar';
import { destinoSeguro, etapaInicialDoEntrar, lerEmail, MENSAGENS_CONTA } from '@/lib/conta';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página de conta: fora do Google (o sitemap também não a lista). */
export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

type Props = {
  searchParams: Promise<{ voltar?: string | string[]; email?: string | string[]; erro?: string | string[]; etapa?: string | string[] }>;
};

/** Login por código. Já entrado: segue direto para o destino (?voltar=, ou /radar). */
export default async function Entrar({ searchParams }: Props) {
  await connection();
  const { voltar, email, erro, etapa } = await searchParams;
  const destino = destinoSeguro(typeof voltar === 'string' ? voltar : null);
  if (await usuarioAtual()) redirect(destino);
  const emailInicial = lerEmail(typeof email === 'string' ? email : null) ?? '';
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-4 py-10">
        {erro === 'link' ? (
          <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] font-semibold text-pin-strong">
            {MENSAGENS_CONTA.link}
          </p>
        ) : null}
        <FormEntrar destino={destino} emailInicial={emailInicial} etapaInicial={etapaInicialDoEntrar(etapa, emailInicial)} />
      </main>
    </>
  );
}
