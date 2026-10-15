import Link from 'next/link';
import { moeda, numero, quantidade } from '@/lib/formato';
import type { ItemEdital } from '@/lib/tipos';

const CELULA = 'border-b border-line p-2.5 align-top';

export function TabelaItens({ itens, total, slug, todos }: { itens: ItemEdital[]; total: number; slug: string; todos: boolean }) {
  if (total === 0) return <p className="text-ink-muted">O PNCP ainda não trouxe os itens deste edital. Veja no edital oficial.</p>;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-[13.5px]">
          <thead>
            <tr className="text-left text-xs text-ink-muted">
              <th scope="col" className="border-b border-line py-2 pr-2 font-semibold">#</th>
              <th scope="col" className="border-b border-line p-2 font-semibold">Descrição</th>
              <th scope="col" className="border-b border-line p-2 text-right font-semibold">Qtd.</th>
              <th scope="col" className="border-b border-line p-2 font-semibold">Unid.</th>
              <th scope="col" className="border-b border-line p-2 text-right font-semibold">Unit. estimado</th>
              <th scope="col" className="border-b border-line py-2 pl-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {itens.map((i) => (
              <tr key={i.numero}>
                <td className={`${CELULA} pl-0 text-ink-muted`}>{i.numero}</td>
                <td className={CELULA}>{i.descricao}</td>
                <td className={`${CELULA} text-right font-mono`}>{quantidade(i.quantidade)}</td>
                <td className={CELULA}>{i.unidade ?? '—'}</td>
                <td className={`${CELULA} text-right font-mono`}>{i.sigiloso ? 'Sigiloso' : moeda(i.valor_unitario_estimado) ?? '—'}</td>
                <td className={`${CELULA} pr-0 text-right font-mono`}>{i.sigiloso ? 'Sigiloso' : moeda(i.valor_total_estimado) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
