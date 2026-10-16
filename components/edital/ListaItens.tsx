import Link from 'next/link';
import { numero } from '@/lib/formato';
import type { ItemEdital } from '@/lib/tipos';
import { ItemOrganizado } from './ItemOrganizado';

export function ListaItens({ itens, total, slug, todos }: { itens: ItemEdital[] | null; total: number; slug: string; todos: boolean }) {
  if (itens === null) {
    return (
      <p className="text-ink-muted">
        Itens indisponíveis agora. O PNCP não respondeu: veja no edital oficial ou tente de novo em alguns minutos.
      </p>
    );
  }
  if (itens.length === 0) return <p className="text-ink-muted">O PNCP ainda não trouxe os itens deste edital. Veja no edital oficial.</p>;
  return (
    <>
      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7rem_8rem_8rem] gap-x-2 border-b border-line pb-2 text-xs font-semibold text-ink-muted xl:grid" aria-hidden="true">
        <span>#</span>
        <span>Item</span>
        <span className="text-right">Qtd.</span>
        <span className="text-right">Unit. estimado</span>
        <span className="text-right">Total</span>
      </div>
      <ol className="flex flex-col">
        {itens.map((i) => (
          <ItemOrganizado key={i.numero} item={i} />
        ))}
      </ol>
      {!todos && total > itens.length ? (
        <Link href={`/edital/${slug}?itens=todos`} className="mt-3 inline-block text-sm font-semibold text-pin-strong hover:underline">
          Ver todos os {numero(total)} itens
        </Link>
      ) : null}
      {todos && total > itens.length ? (
        <p className="mt-3 text-sm text-ink-muted">
          Mostrando os {numero(itens.length)} primeiros de {numero(total)} itens. Os demais estão no edital oficial.
        </p>
      ) : null}
    </>
  );
}
