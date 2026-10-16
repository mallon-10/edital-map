import Link from 'next/link';
import { diaMes, hora, moeda, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { nomeProprio, tituloCurto } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { PinoMini } from './Icones';

const ROTULO_BASE = 'font-mono text-[10px] uppercase tracking-[0.08em]';
const ROTULO = `${ROTULO_BASE} text-[#a9c9c4]`;
/** "CIDADE · UF" no topo do cartão, em laranja como no mockup. */
const SOBRETITULO = `${ROTULO_BASE} text-pin`;

/** Resumo escuro do edital selecionado, com "Ver edital". */
export function CartaoSelecionado({ edital: e, agora, aoFechar }: { edital: EditalResumo; agora: Date; aoFechar?: () => void }) {
  const p = prazo(e.encerramento_em, agora);
  const orgao = [nomeProprio(e.orgao_nome), e.unidade_nome ? nomeProprio(e.unidade_nome) : null].filter(Boolean).join(' · ');
  const forma = [modalidadeCurta(e.modalidade_nome), e.srp ? 'Registro de preços' : null].filter(Boolean).join(' · ');
  return (
    <article className="relative flex flex-col gap-3 rounded-lg bg-ink p-5 text-surface">
      {aoFechar ? (
        <button type="button" onClick={aoFechar} aria-label="Fechar resumo" className="absolute right-3 top-3 size-8 rounded-sm text-lg hover:bg-white/10">
          ×
        </button>
      ) : null}
      <p className={`flex items-center gap-2 ${SOBRETITULO}`}>
        <PinoMini className="h-3.5 w-2.5" />
        {e.municipio_nome ?? '—'} · {e.uf}
      </p>
      <h2 className="pr-6 text-[17px] font-bold leading-snug">{tituloCurto(e.objeto).titulo}</h2>
      <p className="text-[13px] text-[#c7d6d3]">{orgao}</p>
      <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
        <div>
          <p className={ROTULO}>Valor estimado</p>
          <p className="font-mono text-[14px] font-medium">{moeda(e.valor_estimado) ?? 'Valor não informado'}</p>
        </div>
        <div>
          <p className={ROTULO}>Propostas até</p>
          <p className="font-mono text-[14px] font-medium">
            {diaMes(e.encerramento_em)} · {hora(e.encerramento_em)}
          </p>
          <p className="text-[11px] text-[#c7d6d3]">{p.texto}</p>
        </div>
      </div>
      {forma ? <p className="text-[13px] text-[#c7d6d3]">{forma}</p> : null}
      <Link href={`/edital/${e.slug}`} className="mt-1 inline-flex h-11 items-center justify-center rounded-sm bg-pin text-sm font-semibold text-on-pin">
        Ver edital
      </Link>
    </article>
  );
}
