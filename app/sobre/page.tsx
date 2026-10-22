import type { Metadata } from 'next';
import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';
import { MarcarInterno } from '@/components/MarcarInterno';
import { FONTE_COBERTURA } from '@/lib/cobertura';
import { planoDaPagina } from '@/lib/servidor/plano';
import { contextoDaPagina } from '@/lib/servidor/registro';

export const metadata: Metadata = {
  title: 'Sobre',
  description: 'Como o Edital Map reúne as licitações abertas do PNCP no mapa, de onde vêm os dados e com que frequência são atualizados.',
  alternates: { canonical: '/sobre' },
};

type Props = { searchParams: Promise<{ interno?: string }> };

export default async function PaginaSobre({ searchParams }: Props) {
  const { interno } = await searchParams;
  // Plano no servidor: a faixa da oferta já vem no HTML (sem pular depois do carregamento).
  const plano = await planoDaPagina(await contextoDaPagina());
  return (
    <>
      <Cabecalho plano={plano} />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-8 text-[15px] leading-relaxed md:px-6">
        <MarcarInterno ativo={interno === '1'} />
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Sobre o Edital Map</h1>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">De onde vêm os dados</h2>
          <p>
            Do PNCP, o Portal Nacional de Contratações Públicas, onde os órgãos publicam as contratações da Lei 14.133. O Edital Map copia esses
            dados a cada 3 horas: editais abertos de todo o Brasil nas modalidades Pregão, Concorrência, Dispensa e Credenciamento. Licitações
            publicadas só em outros portais, ou em outras modalidades (como leilão e concurso), não aparecem aqui. Revogadas e anuladas saem da
            lista; suspensas aparecem com a etiqueta &quot;Suspensa&quot;.
          </p>
          <p className="text-[13px] text-ink-muted">{FONTE_COBERTURA}</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">O que o site faz e o que não faz</h2>
          <p>
            Mostra no mapa os editais abertos e deixa você buscar pelo que sua empresa vende. Não participa da licitação: você participa pelo
            sistema indicado no edital oficial, e as regras valem conforme esse edital. O ponto no mapa é a sede do órgão comprador, não o local de entrega.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Licitações por assunto e estado</h2>
          <p>
            Veja as licitações abertas de cada assunto (EPI, uniformes, limpeza, informática e outros) em cada estado na página{' '}
            <Link href="/licitacoes" prefetch={false} className="font-semibold text-pin-strong hover:underline">Licitações abertas</Link>.
          </p>
        </section>
        <section id="cookies" className="flex scroll-mt-24 flex-col gap-2">
          <h2 className="text-lg font-bold">Cookies e anúncios</h2>
          <p>
            Usamos um cookie próprio para agrupar as visitas deste navegador e reconhecer a assinatura feita nele. Com a sua permissão no aviso de cookies, a tag do
            Google Ads e o Pixel da Meta medem se nossos anúncios trazem visitas e assinaturas. Se você recusar, o Google recebe só
            sinais anônimos, sem cookies, e a Meta não recebe nada. Para mudar a escolha, limpe os dados do site no navegador e o aviso volta a aparecer.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Seu e-mail</h2>
          <p>
            Se você criar um alerta, guardamos na sua conta o nome, os produtos e a área escolhida, e mandamos para o e-mail da conta os editais novos às 7h (e, no Pro, o resumo de segunda). Cada e-mail tem um link para parar de receber.
            Para apagar seus dados, escreva para o contato abaixo pedindo a exclusão.
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Contato</h2>
          <p>
            <a href="mailto:mallon@escalav.com.br" className="font-semibold text-pin-strong hover:underline">mallon@escalav.com.br</a>
          </p>
        </section>
      </main>
    </>
  );
}
