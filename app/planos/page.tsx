import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ConteudoPlanos } from '@/components/planos/ConteudoPlanos';
import { pagamentoLigado, planoDaPagina } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = {
  title: 'Planos',
  description:
    'Planos do Edital Map: buscas e editais grátis e sem limite; o Pro, por R$ 37,90/mês, manda novas licitações do seu segmento por e-mail todos os dias às 7h e um resumo às segundas-feiras.',
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
      <ConteudoPlanos pagamento={pagamento} atual={plano.plano} />
    </>
  );
}
