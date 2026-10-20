import Link from 'next/link';
import { largura, type Dia } from '@/lib/admin';
import { numero } from '@/lib/formato';

export function Cartao({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-raised p-4">
      <div>
        <h2 className="text-[15px] font-bold">{titulo}</h2>
        {nota && <p className="text-[12px] text-ink-muted">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

export function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-line bg-raised px-4 py-3">
      <span className="text-[12px] font-semibold text-ink-muted">{rotulo}</span>
      <span className="text-[26px] font-bold leading-tight tabular-nums">{numero(valor)}</span>
      {detalhe && <span className="text-[12px] text-ink-muted">{detalhe}</span>}
    </div>
  );
}

export type Item = { chave: string; rotulo: string; n: number; extra?: string; href?: string; mono?: boolean };

/** Lista em ordem, com barra proporcional ao maior (uma cor só: é magnitude, não identidade). */
export function ListaBarras({ itens, vazio = 'Nada no período.' }: { itens: Item[]; vazio?: string }) {
  if (itens.length === 0) return <p className="text-[13px] text-ink-muted">{vazio}</p>;
  const maior = Math.max(...itens.map((i) => i.n));
  return (
    <ol className="flex flex-col gap-2">
      {itens.map((i) => (
        <li key={i.chave} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className={`min-w-0 truncate ${i.mono ? 'font-mono text-[12px]' : ''}`} title={i.rotulo}>
              {i.href ? (
                <Link href={i.href} prefetch={false} className="hover:underline">{i.rotulo}</Link>
              ) : (
                i.rotulo
              )}
            </span>
            <span className="shrink-0 tabular-nums">
              <strong>{numero(i.n)}</strong>
              {i.extra && <span className="ml-1.5 text-ink-muted">{i.extra}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-xs bg-sunken">
            <div className="h-full rounded-xs bg-rio" style={{ width: `${largura(i.n, maior)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/** Visitantes por dia em barras (dica com os quatro números do dia) e a mesma série em tabela. */
export function SerieDiaria({ dias }: { dias: Dia[] }) {
  const maior = Math.max(1, ...dias.map((d) => d.visitantes));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-36 items-end gap-[2px] border-b border-line-strong" role="img" aria-label="Visitantes por dia">
        {dias.map((d) => (
          <div
            key={d.dia}
            className="group relative flex h-full min-w-0 flex-1 items-end"
            title={`${diaCurto(d.dia)}: ${d.visitantes} visitantes, ${d.paginas} páginas, ${d.buscas} buscas, ${d.editais} editais`}
          >
            <div
              className="w-full rounded-t-xs bg-rio group-hover:bg-ink"
              style={{ height: d.visitantes ? `${Math.max(3, (d.visitantes / maior) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-ink-muted tabular-nums">
        <span>{diaCurto(dias[0].dia)}</span>
        <span>máx. {numero(maior)} visitantes</span>
        <span>{diaCurto(dias[dias.length - 1].dia)}</span>
      </div>
      <details className="text-[13px]">
        <summary className="cursor-pointer font-semibold text-pin-strong">Ver por dia em tabela</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-[12px] text-ink-muted">
              <tr><th className="py-1 pr-3">Dia</th><th className="pr-3">Visitantes</th><th className="pr-3">Páginas</th><th className="pr-3">Buscas</th><th>Editais</th></tr>
            </thead>
            <tbody>
              {[...dias].reverse().map((d) => (
                <tr key={d.dia} className="border-t border-line">
                  <td className="py-1 pr-3">{diaCurto(d.dia)}</td><td className="pr-3">{d.visitantes}</td><td className="pr-3">{d.paginas}</td>
                  <td className="pr-3">{d.buscas}</td><td>{d.editais}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
