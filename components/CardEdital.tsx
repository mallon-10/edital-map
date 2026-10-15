import Link from 'next/link';
import { dataHora, moeda, prazo } from '@/lib/formato';
import type { EditalResumo } from '@/lib/tipos';
import { PONTO_PRAZO, TAG_PRAZO, TEXTO_PRAZO } from './estilosPrazo';

/** Card de altura fixa: cada informação sempre no mesmo lugar. */
export function CardEdital({ edital, agora }: { edital: EditalResumo; agora: Date }) {
  const p = prazo(edital.encerramento_em, agora);
  const valor = moeda(edital.valor_estimado);
  return (
    <article className="grid h-[244px] shrink-0 grid-cols-1 grid-rows-[22px_44px_18px_28px_20px_1fr] gap-y-2 rounded-md border border-line bg-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>
          <span className={`size-[7px] rounded-full ${PONTO_PRAZO[p.tom]}`} aria-hidden="true" />
          {p.situacao}
        </span>
        <span className={`min-w-0 truncate text-[13px] ${TEXTO_PRAZO[p.tom]}`} title={p.texto}>{p.texto}</span>
      </div>
      <h3 className="line-clamp-2 text-[15px] font-semibold leading-[22px]" title={edital.objeto}>
        {edital.objeto}
      </h3>
      <p className="truncate text-xs text-rio" title={edital.item_trecho ?? undefined}>
        {edital.onde === 'itens' && edital.item_trecho ? <>Encontrado nos itens: <span className="font-medium">{edital.item_trecho}</span></> : null}
      </p>
      <div className="flex items-baseline justify-between gap-2">
        {valor ? (
          <b className="whitespace-nowrap font-mono text-xl font-medium tracking-[-0.02em]">{valor}</b>
        ) : (
          <b className="text-sm font-medium text-ink-muted">Valor não informado</b>
        )}
        <span className="max-w-[45%] truncate text-right text-xs text-ink-muted" title={edital.modalidade_nome ?? undefined}>
          {edital.modalidade_nome}
        </span>
      </div>
      <p className="truncate text-[13px] text-ink-muted" title={edital.orgao_nome}>
        {edital.orgao_nome} · {edital.municipio_nome ?? '—'}/{edital.uf}
      </p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs text-ink-muted">
          Propostas até
          <span className="block font-mono text-[13px] font-medium text-ink">{dataHora(edital.encerramento_em)}</span>
        </p>
        <Link
          href={`/edital/${edital.slug}`}
          aria-label={`Ver edital: ${edital.objeto}`}
          className="h-9 whitespace-nowrap rounded-sm bg-ink px-3.5 text-[13px] font-semibold leading-9 text-surface hover:bg-[#1b3a63]"
        >
          Ver edital
        </Link>
      </div>
    </article>
  );
}
