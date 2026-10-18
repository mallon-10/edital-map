import type { ReactNode } from 'react';
import { dataHora, moeda, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { nomeProprio, textoLimpo } from '@/lib/texto';
import type { Edital } from '@/lib/tipos';

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-b-0 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-4">
      <dt className="text-[13px] font-semibold text-ink-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words text-[15px]">{children}</dd>
    </div>
  );
}

const Falta = () => <span className="text-ink-muted">Não informado pelo órgão</span>;

/** Informações principais num bloco só; o que o PNCP não trouxe aparece como "Não informado pelo órgão". */
export function FichaEdital({ edital: e, agora, atualizadoEm }: { edital: Edital; agora: Date; atualizadoEm: string | null }) {
  const valor = moeda(e.valor_estimado);
  const p = prazo(e.encerramento_em, agora);
  const modalidade = modalidadeCurta(e.modalidade_nome);
  return (
    <section aria-labelledby="ficha" className="rounded-lg border border-line bg-raised p-5">
      <h2 id="ficha" className="mb-1 text-[17px] font-bold">Informações principais</h2>
      <dl>
        <Linha rotulo="Objeto">{textoLimpo(e.objeto)}</Linha>
        <Linha rotulo="Órgão">
          {nomeProprio(e.orgao_nome)}
          {e.unidade_nome ? <span className="block text-[13px] text-ink-muted">{nomeProprio(e.unidade_nome)}</span> : null}
        </Linha>
        <Linha rotulo="Município/UF">{e.municipio_nome ? `${e.municipio_nome}/${e.uf}` : <>{e.uf} · <Falta /></>}</Linha>
        <Linha rotulo="Modalidade">
          {modalidade ?? <Falta />}
          {e.srp ? ' · Registro de preços' : ''}
        </Linha>
        <Linha rotulo="Identificador no PNCP">
          <span className="font-mono text-[14px]">{e.id}</span>
        </Linha>
        <Linha rotulo="Valor estimado">{valor ? <span className="font-mono">{valor}</span> : <Falta />}</Linha>
        <Linha rotulo="Publicado no PNCP em">{e.publicada_em ? <span className="font-mono">{dataHora(e.publicada_em)}</span> : <Falta />}</Linha>
        <Linha rotulo="Prazo para propostas">
          {e.encerramento_em ? (
            <>
              <span className="font-mono">{dataHora(e.encerramento_em)}</span> <span className="text-[13px] text-ink-muted">· {p.texto}</span>
            </>
          ) : (
            <Falta />
          )}
        </Linha>
        <Linha rotulo="Situação oficial">{e.situacao_nome ?? <Falta />}</Linha>
        <Linha rotulo="Fonte">PNCP (Portal Nacional de Contratações Públicas)</Linha>
        <Linha rotulo="Última alteração no PNCP">
          {e.atualizada_pncp_em ? <span className="font-mono">{dataHora(e.atualizada_pncp_em)}</span> : <Falta />}
        </Linha>
        <Linha rotulo="Atualizado no Edital Map em">
          {atualizadoEm ? <span className="font-mono">{dataHora(atualizadoEm)}</span> : <span className="text-ink-muted">Sem registro da última atualização</span>}
        </Linha>
      </dl>
    </section>
  );
}
