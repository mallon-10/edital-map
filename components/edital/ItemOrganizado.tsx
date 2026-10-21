import { moeda, quantidade } from '@/lib/formato';
import { partirItem } from '@/lib/texto';
import type { ItemEdital } from '@/lib/tipos';

const ETIQUETA = 'rounded-xs bg-sunken px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted';
const ETIQUETA_MEEPP = 'rounded-xs bg-mata-soft px-1.5 py-0.5 text-[11px] font-semibold text-mata';

/** Um item: nome em destaque, etiquetas, especificação em lista (recolhida quando é longa) e valores. */
export function ItemOrganizado({ item }: { item: ItemEdital }) {
  const { nome, atributos, obs, etiquetas } = partirItem(item.descricao);
  const exclusivo = item.beneficio_id === 1;
  const cota = item.beneficio_id === 3;
  const longa = atributos.length > 3 || (obs?.length ?? 0) > 180;
  const valorUnitario = item.sigiloso ? null : moeda(item.valor_unitario_estimado);
  const valorTotal = item.sigiloso ? null : moeda(item.valor_total_estimado);
  const unitario = item.sigiloso ? 'Sigiloso' : (valorUnitario ?? '—');
  const total = item.sigiloso ? 'Sigiloso' : (valorTotal ?? '—');
  const qtd = item.quantidade === null ? null : `${quantidade(item.quantidade)} ${item.unidade ?? ''}`.trim();
  const linhaCelular = [qtd, ...(item.sigiloso ? ['valores sigilosos'] : [valorUnitario ? `${valorUnitario} un.` : null, valorTotal])]
    .filter(Boolean)
    .join(' · ');

  // Atributos: no celular o nome fica em cima do valor (lado a lado, o valor virava uma tira estreita); a partir de sm, em duas colunas.
  const especificacao =
    atributos.length || obs ? (
      <div className="mt-1.5 text-[13px] text-ink-muted">
        {atributos.length ? (
          <dl className="grid grid-cols-1 gap-x-3 sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-y-0.5">
            {atributos.map((a, i) => (
              <div key={i} className="contents">
                <dt className="break-words text-[12px] sm:max-w-[40vw] sm:text-[13px]">{a.chave}</dt>
                <dd className="mb-1.5 break-words text-ink sm:mb-0">{a.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {obs ? (
          <p className={`break-words ${atributos.length ? 'mt-1.5' : ''}`}>
            {atributos.length ? <span className="font-semibold">Obs.: </span> : null}
            {obs}
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-b border-line py-3 xl:grid-cols-[2.5rem_minmax(0,1fr)_7rem_8rem_8rem]">
      <span className="font-mono text-[13px] text-ink-muted">{item.numero}</span>
      <div className="min-w-0">
        <p className="break-words text-[14.5px] font-semibold">{nome}</p>
        {etiquetas.length || exclusivo || cota ? (
          <p className="mt-1 flex flex-wrap gap-1.5">
            {exclusivo ? <span className={ETIQUETA_MEEPP}>ME/EPP</span> : null}
            {cota ? <span className={ETIQUETA_MEEPP}>Cota ME/EPP</span> : null}
            {etiquetas.map((t) => (
              <span key={t} className={ETIQUETA}>
                {t}
              </span>
            ))}
          </p>
        ) : null}
        {especificacao ? (
          longa ? (
            <details className="group mt-1">
              <summary className="cursor-pointer text-[13px] font-semibold text-pin-strong">
                <span className="group-open:hidden">Ver especificação</span>
                <span className="hidden group-open:inline">Ocultar especificação</span>
              </summary>
              {especificacao}
            </details>
          ) : (
            especificacao
          )
        ) : null}
        {linhaCelular ? <p className="mt-1.5 text-[13px] text-ink-muted xl:hidden">{linhaCelular}</p> : null}
      </div>
      <span className="hidden text-right font-mono text-[13px] xl:block">
        <span className="sr-only">Quantidade: </span>
        {quantidade(item.quantidade)} <span className="font-sans text-ink-muted">{item.unidade ?? ''}</span>
      </span>
      <span className="hidden text-right font-mono text-[13px] xl:block">
        <span className="sr-only">Valor unitário: </span>
        {unitario}
      </span>
      <span className="hidden text-right font-mono text-[13px] font-medium xl:block">
        <span className="sr-only">Total: </span>
        {total}
      </span>
    </li>
  );
}
