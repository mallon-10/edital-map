'use client';

import { useState } from 'react';
import { EtiquetaPro } from '@/components/EtiquetaPro';
import { MAX_EXPORTACAO } from '@/lib/csv';
import { numero } from '@/lib/formato';
import { Planilha } from './Icones';

const ERRO = 'Não foi possível exportar agora. Tente de novo.';

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
        const corpo = (await r.json().catch(() => null)) as { erro?: unknown } | null;
        throw new Error(typeof corpo?.erro === 'string' && corpo.erro ? corpo.erro : ERRO);
      }
      const nome = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'editais.csv';
      const url = URL.createObjectURL(await r.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      aoErro(e instanceof Error && e.message ? e.message : ERRO);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={total === 0 || baixando}
      title={`Baixa uma planilha (CSV) com até ${numero(MAX_EXPORTACAO)} editais desta busca`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-line-strong bg-raised px-2.5 text-[13px] font-semibold hover:bg-sunken disabled:opacity-50"
    >
      <Planilha className="size-4" />
      {baixando ? 'Exportando…' : 'Exportar'}
      <EtiquetaPro />
    </button>
  );
}
