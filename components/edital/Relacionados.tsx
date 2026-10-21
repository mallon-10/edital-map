import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from '@/components/inicio/estilos';
import { etiqueta, moedaCurta } from '@/lib/formato';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalRelacionado } from '@/lib/tipos';
import { LinkRelacionado } from './LinkRelacionado';

type Props = { editais: EditalRelacionado[]; origem: string; agora: Date };

/** "Editais parecidos abertos": cards no estilo do CardCompacto, cada um levando à página do edital. Sem nenhum, o bloco não aparece. */
export function Relacionados({ editais, origem, agora }: Props) {
  if (editais.length === 0) return null;
  return (
    <section aria-labelledby="parecidos-titulo" className="rounded-[22px] bg-raised p-5 lg:p-6">
      <h2 id="parecidos-titulo" className="mb-3 text-[18px] font-semibold">
        Editais parecidos abertos
      </h2>
      {/* grid-cols-1 = minmax(0, 1fr): sem ela a coluna crescia até a linha "truncate" inteira e a página vazava no celular. */}
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {editais.map((e) => {
          const et = etiqueta(e, agora);
          const valor = moedaCurta(e.valor_estimado);
          const { titulo, tipo } = assunto(e.objeto);
          return (
            <li key={e.id} className="flex min-w-0">
              <LinkRelacionado
                href={`/edital/${e.slug}`}
                origem={origem}
                className="flex w-full min-w-0 flex-col gap-2 rounded-[16px] border border-line bg-raised p-4 transition-colors hover:border-line-strong"
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
                <span className={`mt-auto inline-flex h-[26px] w-fit items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
                  <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
                  {et.texto}
                </span>
              </LinkRelacionado>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
