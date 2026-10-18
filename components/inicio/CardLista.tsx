import Link from 'next/link';
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { data, dataHora, etiqueta, moeda } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from './estilos';
import { IndicadorRelevancia } from './Relevancia';
import { TituloDestacado } from './TituloDestacado';

const ROTULO = 'text-xs text-ink-muted';

/**
 * Card largo da vista Lista: título descritivo com destaque, órgão, município/UF, valor, modalidade, prazo, publicação,
 * relevância com explicação (com termo) e "Suspensa". O título é o link (a área toda do card abre o edital);
 * o "?" da relevância fica por cima. Sem prefetch: cada edital aberto conta no limite do dia.
 */
export function CardLista({ edital: e, agora }: { edital: EditalResumo; agora: Date }) {
  const et = etiqueta(e, agora);
  const valor = moeda(e.valor_estimado);
  const { titulo, tipo } = assunto(e.objeto);
  const forma = [modalidadeCurta(e.modalidade_nome), e.srp ? 'Registro de preços' : null].filter(Boolean).join(' · ');
  return (
    <article className="relative flex shrink-0 flex-col gap-2.5 rounded-md border border-line bg-raised p-4 transition-colors hover:border-line-strong">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
          <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
          {et.texto}
        </span>
        <EtiquetaSituacao situacaoId={e.situacao_id} />
        {tipo ? <span className="rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">{tipo}</span> : null}
      </div>
      <h3 className="line-clamp-3 text-[16px] font-bold leading-snug">
        <Link href={`/edital/${e.slug}`} prefetch={false} className="after:absolute after:inset-0 after:rounded-md">
          <TituloDestacado texto={titulo} termos={e.destaques} />
        </Link>
      </h3>
      <p className="text-[13px] text-ink-muted">
        {nomeProprio(e.orgao_nome)} · {e.municipio_nome ?? 'Município não informado'}/{e.uf}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
        <div>
          <dt className={ROTULO}>Valor estimado</dt>
          <dd className="font-mono font-medium">{valor ?? 'Valor não informado'}</dd>
        </div>
        <div>
          <dt className={ROTULO}>Modalidade</dt>
          <dd>{forma || 'Não informada'}</dd>
        </div>
        <div>
          <dt className={ROTULO}>Propostas até</dt>
          <dd className="font-mono">{dataHora(e.encerramento_em)}</dd>
        </div>
        <div>
          <dt className={ROTULO}>Publicado em</dt>
          <dd className="font-mono">{e.publicada_em ? data(e.publicada_em) : 'Não informado'}</dd>
        </div>
      </dl>
      {e.relevancia ? (
        <div className="relative z-10 w-fit">
          <IndicadorRelevancia relevancia={e.relevancia} />
        </div>
      ) : null}
    </article>
  );
}
