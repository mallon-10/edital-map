'use client';

import { useState } from 'react';
import { MAX_EXPORTACAO } from '@/lib/csv';
import { ERRO_EXPORTAR, ErroDaApi, mensagemDaApi, nomeDoArquivo } from '@/lib/exportar-cliente';
import { numero } from '@/lib/formato';
import { AVISO_EXPORTAR_GRATIS } from '@/lib/limiteBusca';
import { IconeBaixar, Planilha } from './Icones';

type Props = {
  /** Parâmetros da busca atual (os mesmos de /api/busca). */
  parametros: string;
  total: number;
  /** Recebe a mensagem de erro (ou null ao começar de novo); quem chama a mostra, para não aumentar a linha da contagem. */
  aoErro: (mensagem: string | null) => void;
  /** Botão redondo só com o ícone (cartão do topo da página inicial). */
  redondo?: boolean;
  /** Grátis pesquisando um assunto: a planilha só traz os editais liberados, e a tela avisa. */
  limitado?: boolean;
};

/** Botão redondo do cartão do topo (54 px no celular, 60 px no computador). */
export const REDONDO =
  'inline-flex size-[54px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised text-ink hover:bg-sunken lg:size-[60px]';

/** Baixa a planilha (CSV) da busca atual. Por fetch, para mostrar o erro da API (como o limite por hora) em vez de um download quebrado. */
export function BotaoExportar({ parametros, total, aoErro, redondo = false, limitado = false }: Props) {
  const [baixando, setBaixando] = useState(false);

  async function exportar() {
    setBaixando(true);
    aoErro(null);
    try {
      const r = await fetch(`/api/exportar?${parametros}`);
      if (!r.ok) {
        const corpo: unknown = await r.json().catch(() => null);
        throw new ErroDaApi(mensagemDaApi(corpo));
      }
      const nome = nomeDoArquivo(r.headers.get('content-disposition'), new Date());
      const url = URL.createObjectURL(await r.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      if (limitado) aoErro(AVISO_EXPORTAR_GRATIS);
    } catch (e) {
      aoErro(e instanceof ErroDaApi ? e.message : ERRO_EXPORTAR);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={total === 0 || baixando}
      aria-busy={baixando}
      aria-label={baixando ? 'Exportando planilha…' : 'Exportar planilha (CSV)'}
      title={`Baixa uma planilha (CSV) com até ${numero(MAX_EXPORTACAO)} editais desta busca`}
      className={
        redondo
          ? `${REDONDO} disabled:opacity-50 ${baixando ? 'animate-pulse' : ''}`
          : 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-line-strong bg-raised px-2.5 text-[13px] font-semibold hover:bg-sunken disabled:opacity-50'
      }
    >
      {redondo ? (
        <IconeBaixar className="size-[22px]" />
      ) : (
        <>
          <Planilha className="size-4" />
          {baixando ? 'Exportando…' : 'Exportar'}
        </>
      )}
    </button>
  );
}
