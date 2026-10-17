'use client';

import { useState } from 'react';
import { EtiquetaPro } from '@/components/EtiquetaPro';
import { MAX_EXPORTACAO } from '@/lib/csv';
import { ERRO_EXPORTAR, ErroDaApi, mensagemDaApi, nomeDoArquivo } from '@/lib/exportar-cliente';
import { numero } from '@/lib/formato';
import { Planilha } from './Icones';

type Props = {
  /** Parâmetros da busca atual (os mesmos de /api/busca). */
  parametros: string;
  total: number;
  /** Recebe a mensagem de erro (ou null ao começar de novo); quem chama a mostra, para não aumentar a linha da contagem. */
  aoErro: (mensagem: string | null) => void;
};

/** Baixa a planilha (CSV) da busca atual. Por fetch, para mostrar o erro da API (como o limite por hora) em vez de um download quebrado. */
export function BotaoExportar({ parametros, total, aoErro }: Props) {
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
      aria-label="Exportar planilha (CSV)"
      title={`Baixa uma planilha (CSV) com até ${numero(MAX_EXPORTACAO)} editais desta busca`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-line-strong bg-raised px-2.5 text-[13px] font-semibold hover:bg-sunken disabled:opacity-50"
    >
      <Planilha className="size-4" />
      {baixando ? 'Exportando…' : 'Exportar'}
      <EtiquetaPro />
    </button>
  );
}
