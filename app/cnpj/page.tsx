import type { Metadata } from 'next';
import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { BuscaCnpj } from '@/components/cnpj/BuscaCnpj';
import { planoDaPagina } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = {
  title: 'Licitações para o seu CNPJ',
  description: 'Digite o CNPJ da sua empresa e veja as licitações abertas do seu segmento no seu estado, direto do PNCP.',
  alternates: { canonical: '/cnpj' },
};

/** Entrada pelo CNPJ: página de destino dos anúncios e atalho da página inicial. */
export default async function PaginaCnpj() {
  // Plano no servidor: a faixa da oferta já vem no HTML (sem pular depois do carregamento).
  const plano = await planoDaPagina(await contextoDaPagina());
  return (
    <>
      <Cabecalho plano={plano} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-10 text-[15px] leading-relaxed md:px-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em] md:text-[32px]">Licitações para o seu CNPJ</h1>
        <p className="text-ink-muted">
          Digite o CNPJ: lemos a atividade da empresa na Receita e mostramos os editais abertos do seu segmento no seu estado, de todo
          o PNCP.
        </p>
        <BuscaCnpj />
        <p className="text-[13px] text-ink-muted">
          Prefere escolher?{' '}
          <Link href="/licitacoes" prefetch={false} className="font-semibold text-pin-strong hover:underline">
            Veja as licitações por assunto e estado
          </Link>
          .
        </p>
      </main>
    </>
  );
}
