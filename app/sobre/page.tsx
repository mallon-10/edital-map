import type { Metadata } from 'next';
import { Cabecalho } from '@/components/Cabecalho';
import { MarcarInterno } from '@/components/MarcarInterno';
import { FONTE_COBERTURA } from '@/lib/cobertura';

export const metadata: Metadata = { title: 'Sobre' };

type Props = { searchParams: Promise<{ interno?: string }> };

export default async function PaginaSobre({ searchParams }: Props) {
  const { interno } = await searchParams;
  return (
    <>
      <Cabecalho />
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
          <h2 className="text-lg font-bold">Seu e-mail</h2>
          <p>
            Se você criar um alerta, guardamos o e-mail, o que você vende e os estados escolhidos só para avisar quando os alertas estiverem prontos.
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
