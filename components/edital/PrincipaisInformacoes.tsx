import type { ReactNode } from 'react';
import { TEXTO_PRAZO } from '@/components/estilosPrazo';
import { diaMes, hora, moeda, prazo } from '@/lib/formato';
import { criterioTexto, esferaNome, modalidadeCurta, oQueCompram, sistemaDaDisputa, textoMeEpp } from '@/lib/participacao';
import { nomeProprio } from '@/lib/texto';
import type { Edital, ResumoItens } from '@/lib/tipos';

function Cartao({ rotulo, destaque, children }: { rotulo: string; destaque?: boolean; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1 rounded-md border p-4 ${destaque ? 'border-mata bg-mata-soft' : 'border-line bg-raised'}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">{rotulo}</span>
      {children}
    </div>
  );
}

export function PrincipaisInformacoes({ edital: e, resumo, agora }: { edital: Edital; resumo: ResumoItens; agora: Date }) {
  const p = prazo(e.encerramento_em, agora);
  const valor = moeda(e.valor_estimado);
  const forma = [modalidadeCurta(e.modalidade_nome), e.srp ? 'Registro de preços' : null, criterioTexto(resumo.criterios)].filter(Boolean).join(' · ');
  const meEpp = textoMeEpp(resumo);
  const esfera = esferaNome(e.esfera);
  const propostas = e.encerramento_em
    ? `${e.abertura_em ? `Propostas de ${diaMes(e.abertura_em)} até` : 'Propostas até'} ${diaMes(e.encerramento_em)} · ${hora(e.encerramento_em)}`
    : 'Prazo não informado';
  return (
    <section aria-labelledby="principais" className="flex flex-col gap-3">
      <h2 id="principais" className="text-[17px] font-bold">Principais informações</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Cartao rotulo="O que compram">
          <span className="text-[15px] font-semibold">{oQueCompram(resumo)}</span>
        </Cartao>
        <Cartao rotulo="Quanto">
          {valor ? <span className="font-mono text-[20px] font-medium">{valor}</span> : <span className="text-ink-muted">Valor não informado</span>}
        </Cartao>
        <Cartao rotulo="Prazo">
          <span className="font-mono text-[15px] font-medium">{propostas}</span>
          <span className={`text-[13px] ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
        </Cartao>
        <Cartao rotulo="Como participar">
          {forma ? <span className="text-[15px] font-semibold">{forma}</span> : null}
          <span className="text-[13px] text-ink-muted">Onde: {sistemaDaDisputa(e.link_origem)}</span>
        </Cartao>
        <Cartao rotulo="Quem compra">
          <span className="text-[15px] font-semibold">{nomeProprio(e.orgao_nome)}</span>
          {e.unidade_nome ? <span className="text-[13px] text-ink-muted">{nomeProprio(e.unidade_nome)}</span> : null}
          {esfera ? <span className="text-[13px] text-ink-muted">Esfera {esfera.toLocaleLowerCase('pt-BR')}</span> : null}
        </Cartao>
        {meEpp ? (
          <Cartao rotulo="ME/EPP" destaque={resumo.exclusivos > 0 || resumo.cota > 0}>
            <span className="text-[15px] font-semibold">{meEpp}</span>
          </Cartao>
        ) : null}
      </div>
    </section>
  );
}
