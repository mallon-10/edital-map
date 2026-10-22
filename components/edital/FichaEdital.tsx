import Link from 'next/link';
import type { ReactNode } from 'react';
import { dataHora, moeda, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { nomeProprio, textoLimpo } from '@/lib/texto';
import type { Edital } from '@/lib/tipos';

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-[13px] font-semibold text-ink-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words text-[15px]">{children}</dd>
    </div>
  );
}

const Falta = () => <span className="text-ink-muted">Não informado pelo órgão</span>;

/** Informações principais num bloco só; o que o PNCP não trouxe aparece como "Não informado pelo órgão". */
const LINK = 'text-ink underline decoration-line underline-offset-2 hover:decoration-ink';

/** Texto com link para a página /licitacoes quando ela existe (edital aberto); sem página, só o texto. */
const ComLink = ({ href, children }: { href: string | null | undefined; children: ReactNode }) =>
  href ? <Link href={href} prefetch={false} className={LINK}>{children}</Link> : <>{children}</>;

export function FichaEdital({
  edital: e, agora, atualizadoEm, links,
}: { edital: Edital; agora: Date; atualizadoEm: string | null; links?: { modalidade: string | null; orgao: string | null } }) {
  const valor = moeda(e.valor_estimado);
  const p = prazo(e.encerramento_em, agora);
  const modalidade = modalidadeCurta(e.modalidade_nome);
  return (
    <section aria-labelledby="ficha" className="rounded-[22px] bg-raised p-5 lg:p-6">
      <h2 id="ficha" className="mb-1 text-[18px] font-semibold">Ficha do edital</h2>
      <dl>
        <Linha rotulo="Objeto">{textoLimpo(e.objeto)}</Linha>
        <Linha rotulo="Órgão">
          <ComLink href={links?.orgao}>{nomeProprio(e.orgao_nome)}</ComLink>
          {e.unidade_nome ? <span className="block text-[13px] text-ink-muted">{nomeProprio(e.unidade_nome)}</span> : null}
        </Linha>
        <Linha rotulo="Município/UF">{e.municipio_nome ? `${e.municipio_nome}/${e.uf}` : <>{e.uf} · <Falta /></>}</Linha>
        <Linha rotulo="Modalidade">
          {modalidade ? <ComLink href={links?.modalidade}>{modalidade}</ComLink> : <Falta />}
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
