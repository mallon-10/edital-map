'use client';

import Link from 'next/link';
import { useId } from 'react';
import { etiqueta, moedaCurta } from '@/lib/formato';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { BotaoSalvar } from '@/components/oportunidades/BotaoSalvar';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from './estilos';
import { PilulaRelevancia } from './Relevancia';
import { TituloDestacado } from './TituloDestacado';

type Props = { edital: EditalResumo; agora: Date; aoSelecionar: () => void };

/**
 * Card da lista da página inicial: título limpo (com os termos destacados), valor curto à direita, tipo · órgão · cidade/UF,
 * etiqueta de prazo, "Suspensa" e a relevância (com termo). Clicar ou tocar abre o edital (Enter também); passar o mouse
 * acende o ponto dele no mapa (aoSelecionar). Ctrl/⌘/Shift/Alt/botão do meio abrem em outra aba. Sem prefetch: o edital
 * consulta o PNCP e o banco só quando abre. O link cobre o card inteiro (::after); a pílula da relevância e o "Salvar"
 * ficam fora do link, por cima dele.
 */
export function CardCompacto({ edital, agora, aoSelecionar }: Props) {
  const et = etiqueta(edital, agora);
  const valor = moedaCurta(edital.valor_estimado);
  const { titulo, tipo } = assunto(edital.objeto);
  const idPrazo = useId();
  const lugar = edital.municipio_nome ? `${nomeProprio(edital.municipio_nome)}/${edital.uf}` : edital.uf;

  return (
    <div
      onMouseEnter={aoSelecionar}
      className="relative flex w-full shrink-0 flex-col gap-2.5 rounded-[20px] bg-raised p-[18px] text-left transition-shadow hover:shadow-[0_0_0_1px_#847c6a] lg:rounded-[22px] lg:px-6 lg:py-5"
    >
      <Link
        href={`/edital/${edital.slug}`}
        prefetch={false}
        aria-describedby={idPrazo}
        // link-esticado (globals.css): o contorno do foco vai no ::after, que cobre o card inteiro.
        className="link-esticado flex flex-col gap-2 after:absolute after:inset-0 after:rounded-[20px] lg:after:rounded-[22px]"
      >
        <span className="flex items-start justify-between gap-4">
          <span className="line-clamp-3 text-[17px] font-semibold leading-[23px] lg:text-[19px] lg:leading-[26px]">
            <TituloDestacado texto={titulo} termos={edital.destaques} />
          </span>
          {valor ? (
            <span className="shrink-0 whitespace-nowrap font-mono text-[15px] font-medium lg:text-[17px]">{valor}</span>
          ) : (
            <span className="w-16 shrink-0 text-right text-[12px] leading-4 text-ink-muted">Valor não informado</span>
          )}
        </span>
        <span className="line-clamp-2 text-[14px] leading-5 text-ink-muted lg:text-[15px] lg:leading-[22px]">
          {[tipo, nomeProprio(edital.orgao_nome), lugar].filter(Boolean).join(' · ')}
        </span>
        {edital.onde === 'itens' ? <span className="text-[13px] text-rio">Encontrado nos itens</span> : null}
      </Link>
      <span className="flex flex-wrap items-center gap-1.5">
        {/* Prazo e situação: fora do link (por causa da pílula ao lado), mas lidos com ele (aria-describedby). */}
        <span id={idPrazo} className="inline-flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex h-[26px] w-fit items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
            <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
            {et.texto}
          </span>
          <EtiquetaSituacao situacaoId={edital.situacao_id} />
        </span>
        {edital.relevancia ? (
          <span className="relative z-10 inline-flex">
            <PilulaRelevancia relevancia={edital.relevancia} />
          </span>
        ) : null}
        <span className="relative z-10 -my-2 ml-auto inline-flex focus-within:z-20">
          <BotaoSalvar id={edital.id} />
        </span>
      </span>
    </div>
  );
}
