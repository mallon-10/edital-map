import Link from 'next/link';
import { EtiquetaPro } from '@/components/EtiquetaPro';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from '@/components/inicio/estilos';
import { etiqueta, moedaCurta } from '@/lib/formato';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalRelacionado } from '@/lib/tipos';
import { LinkRelacionado } from './LinkRelacionado';

type Props = { editais: EditalRelacionado[]; origem: string; agora: Date; maisNoBasic?: boolean };

/** "Editais parecidos abertos": cards no estilo do CardCompacto, cada um levando à página do edital. Sem nenhum, o bloco não aparece. */
export function Relacionados({ editais, origem, agora, maisNoBasic = false }: Props) {
  if (editais.length === 0) return null;
  return (
    <section aria-labelledby="parecidos-titulo" className="rounded-lg border border-line bg-raised p-5">
      <h2 id="parecidos-titulo" className="mb-3 flex items-baseline gap-1.5 text-[17px] font-bold">
        Editais parecidos abertos
        <EtiquetaPro className="text-[13px]" />
      </h2>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {editais.map((e) => {
          const et = etiqueta(e, agora);
          const valor = moedaCurta(e.valor_estimado);
          const { titulo, tipo } = assunto(e.objeto);
          return (
            <li key={e.id} className="flex">
              <LinkRelacionado
                href={`/edital/${e.slug}`}
                origem={origem}
                className="flex w-full flex-col gap-2 rounded-md border border-line bg-raised p-3.5 transition-colors hover:border-line-strong"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="line-clamp-3 text-[14px] font-semibold leading-5">{titulo}</span>
                  {valor ? (
                    <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-medium">{valor}</span>
                  ) : (
                    <span className="w-16 shrink-0 text-right text-[11px] leading-4 text-ink-muted">Valor não informado</span>
                  )}
                </span>
                <span className="truncate text-xs text-ink-muted">{[tipo, nomeProprio(e.orgao_nome), e.uf].filter(Boolean).join(' · ')}</span>
                <span className={`mt-auto inline-flex w-fit items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
                  <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
                  {et.texto}
                </span>
              </LinkRelacionado>
            </li>
          );
        })}
      </ul>
      {maisNoBasic ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          Veja todos os parecidos no{' '}
          <Link href="/planos#basic" prefetch={false} className="font-semibold text-pin-strong hover:underline">
            plano Basic
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
