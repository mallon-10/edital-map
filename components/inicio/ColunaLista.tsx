'use client';

import { Fragment, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { FONTE_COBERTURA } from '@/lib/cobertura';
import { posicaoNoMeio } from '@/lib/inicio';
import type { Cidade, EditalResumo, FiltrosTela, Ordem, ResultadoBusca } from '@/lib/tipos';
import type { Vista } from '@/lib/urlBusca';
import { CardCompacto } from './CardCompacto';
import { EstadoVazio } from './EstadoVazio';
import { IconeCheck, IconeGiro } from './Icones';
import { SeletorOrdem } from './SeletorOrdem';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  /** Vista Mapa: no celular, o aviso de que o ponto é a sede do órgão. */
  vista?: Vista;
  /** Filtros aplicados (cidade e prazo aparecem aqui; o estado vazio propõe outras buscas a partir deles). */
  filtros: FiltrosTela;
  carregandoLista: boolean;
  erro: string | null;
  /** Erro do Exportar (o botão fica no cartão do topo; o aviso, aqui). */
  erroExportar: string | null;
  /** Próxima página sendo pedida (lista que carrega ao rolar) e o erro dela. */
  carregandoMais: boolean;
  erroMais: string | null;
  /** Ordem que vale agora (ordemEfetiva). */
  ordem: Ordem;
  temTermo: boolean;
  /** Área dos cards (a página guarda a posição para voltar do edital no mesmo lugar). No celular rola a página. */
  listaRef: RefObject<HTMLDivElement | null>;
  aoRolar: (topo: number) => void;
  aoTirarCidade: () => void;
  /** Mouse sobre um card: acende o ponto dele no mapa. */
  aoSelecionar: (e: EditalResumo) => void;
  aoMudarPrazo: (seteDias: boolean) => void;
  aoMudarOrdem: (o: Ordem) => void;
  /** Pede a próxima página (o fim da lista apareceu na tela, ou o botão "Carregar mais"). */
  aoCarregarMais: () => void;
  /** Link antigo com uma página além do fim: volta ao começo da busca. */
  aoRecomecar: () => void;
  /** Sugestão do estado vazio: outra busca. */
  aoAplicar: (f: FiltrosTela) => void;
  /** Cartão no meio da lista (celular: a assessoria não empurra o primeiro edital). */
  noMeio?: ReactNode;
  /** "286 editais encontrados para…": a busca respondeu (textoDoResultado). */
  confirmacao?: string | null;
  /** Oferta do Pro da busca, entre a confirmação e os editais. Fica montada durante a busca: quem decide se aparece é ela. */
  oferta?: ReactNode;
};

const ALTERNADOR = 'h-10 flex-1 whitespace-nowrap rounded-full px-2 text-[13px] font-semibold transition-colors min-[400px]:text-[14px] lg:flex-none lg:px-4 lg:text-[15px]';

/** Celular: o município escolhido (com o raio), com o × para tirar; no computador ele aparece nos chips. */
function PilulaCidade({ cidade, raio, aoTirar }: { cidade: Cidade; raio: number | null; aoTirar: () => void }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-ink pl-3 text-xs font-semibold text-surface lg:hidden">
      <span className="truncate">
        {cidade.nome}/{cidade.uf}
        {raio ? ` + ${raio} km` : ''}
      </span>
      {/* 24 px visíveis, 44 px de toque (a área invisível passa 10 px de cada lado). */}
      <button
        type="button"
        onClick={aoTirar}
        aria-label="Tirar filtro de cidade"
        className="relative mr-1 size-6 shrink-0 text-base leading-none after:absolute after:-inset-2.5"
      >
        ×
      </button>
    </span>
  );
}

/** Cartões cinza que pulsam no lugar da lista enquanto a busca responde. */
function Esqueleto() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} data-esqueleto className="flex animate-pulse flex-col gap-3 rounded-[22px] bg-raised p-5 motion-reduce:animate-none lg:p-6">
          <span className="block h-5 w-4/5 rounded-full bg-sunken" />
          <span className="block h-4 w-1/2 rounded-full bg-sunken" />
          <span className="block h-7 w-36 rounded-full bg-sunken" />
        </div>
      ))}
    </>
  );
}

/** Resposta da busca, no topo da lista: buscando ou o resultado. Sem busca, nada. */
function AvisoBusca({ buscando, confirmacao }: { buscando: boolean; confirmacao?: string | null }) {
  const AVISO = 'flex items-center gap-2.5 rounded-[16px] px-4 py-3 text-[16px] font-semibold leading-snug lg:text-[17px]';
  if (buscando) {
    return (
      <p role="status" className={`${AVISO} bg-sunken text-ink`}>
        <IconeGiro className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
        <span>Buscando editais…</span>
      </p>
    );
  }
  if (!confirmacao) return null;
  return (
    <p role="status" className={`${AVISO} bg-mata-soft text-mata motion-safe:animate-entrar`}>
      <IconeCheck className="size-5 shrink-0" />
      <span>{confirmacao}</span>
    </p>
  );
}

/**
 * Fim da lista: quando chega perto da tela (800 px antes), pede a próxima página. O botão "Carregar mais" faz o mesmo
 * (teclado, leitor de tela, ou se o observador não existir) e "Tentar de novo" aparece se o pedido falhar.
 */
function FimDaLista({ total, mostrados, carregando, erro, aoCarregarMais }: {
  total: number; mostrados: number; carregando: boolean; erro: string | null; aoCarregarMais: () => void;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const tem = mostrados < total;
  useEffect(() => {
    const el = alvo.current;
    if (!el || !tem || erro || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver((itens) => {
      if (itens.some((i) => i.isIntersecting)) aoCarregarMais();
    }, { rootMargin: '800px 0px' });
    observador.observe(el);
    return () => observador.disconnect();
  }, [tem, erro, aoCarregarMais, mostrados]);
  if (!tem) {
    return mostrados > 0 ? (
      <p className="py-3 text-center text-[13px] text-ink-muted">{mostrados === 1 ? 'Esse é o único edital.' : `Esses são todos os ${mostrados.toLocaleString('pt-BR')} editais.`}</p>
    ) : null;
  }
  return (
    <div ref={alvo} className="flex flex-col items-center gap-2 py-3">
      {erro ? <p role="alert" className="text-sm text-pin-strong">{erro}</p> : null}
      <button
        type="button"
        onClick={aoCarregarMais}
        aria-busy={carregando}
        className="h-12 rounded-full border border-line-strong bg-raised px-6 text-[15px] font-semibold hover:bg-sunken"
      >
        {carregando ? 'Carregando mais editais…' : erro ? 'Tentar de novo' : `Carregar mais (${(total - mostrados).toLocaleString('pt-BR')} restantes)`}
      </button>
    </div>
  );
}

/**
 * "Editais" com o prazo e a ordem, os cards, que vão chegando ao rolar. No fluxo da página (quem rola é a página); a contagem, o
 * valor e o Exportar ficam no cartão do topo.
 */
export function ColunaLista(p: Props) {
  const { editais, total } = p.resultado;
  const vista = p.vista ?? 'mapa';
  const { cidade, raio, seteDias } = p.filtros;
  // Toda busca nova e toda troca de página ou de ordem volta ao topo da lista.
  useEffect(() => {
    if (p.carregandoLista) p.listaRef.current?.scrollTo({ top: 0 });
  }, [p.carregandoLista, p.listaRef]);

  const vazia = editais.length === 0 && !p.carregandoLista && !p.erro;
  const buscando = p.carregandoLista;
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 empty:hidden lg:mb-5">
        <AvisoBusca buscando={buscando} confirmacao={p.confirmacao} />
        {p.oferta ? <div className={buscando ? 'hidden' : 'contents'}>{p.oferta}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <h2 className="px-1 text-[17px] font-medium text-ink-muted lg:text-[20px]">Editais</h2>
        {cidade ? <PilulaCidade cidade={cidade} raio={raio} aoTirar={p.aoTirarCidade} /> : null}
        <span className="ml-auto lg:order-2 lg:ml-0">
          <SeletorOrdem ordem={p.ordem} temTermo={p.temTermo} aoMudar={p.aoMudarOrdem} />
        </span>
        <div className="flex w-full gap-1 rounded-full bg-sunken p-1 lg:order-1 lg:ml-auto lg:w-auto" role="group" aria-label="Prazo">
          <button type="button" aria-pressed={!seteDias} onClick={() => p.aoMudarPrazo(false)} className={`${ALTERNADOR} ${!seteDias ? 'bg-raised' : 'text-ink-muted'}`}>
            Todos abertos
          </button>
          <button type="button" aria-pressed={seteDias} onClick={() => p.aoMudarPrazo(true)} className={`${ALTERNADOR} ${seteDias ? 'bg-raised' : 'text-ink-muted'}`}>
            Encerram em 7 dias
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-col lg:mt-4">
        {vista === 'mapa' ? (
          <p className="mb-3 shrink-0 px-1 font-mono text-[11px] text-ink-muted lg:hidden">O ponto é a sede do órgão, não o local de entrega</p>
        ) : null}
        {p.erro ? <p role="alert" className="mb-3 shrink-0 rounded-[14px] bg-pin-soft px-4 py-3 text-sm text-pin-strong">{p.erro}</p> : null}
        {p.erroExportar ? <p role="alert" className="mb-3 shrink-0 rounded-[14px] bg-pin-soft px-4 py-3 text-sm text-pin-strong">{p.erroExportar}</p> : null}
        <div
          ref={p.listaRef}
          onScroll={(e) => p.aoRolar(e.currentTarget.scrollTop)}
          aria-busy={buscando}
          className="flex flex-col gap-2.5 lg:gap-3"
        >
          {vazia && total > 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-[22px] bg-raised px-6 py-6">
              <p className="text-ink-muted">Esta página não tem editais.</p>
              <button type="button" onClick={p.aoRecomecar} className="h-11 rounded-full border border-line-strong bg-raised px-5 text-sm font-semibold">
                Ver do começo
              </button>
            </div>
          ) : null}
          {vazia && total === 0 ? <EstadoVazio filtros={p.filtros} aoAplicar={p.aoAplicar} /> : null}
          {buscando ? (
            <Esqueleto />
          ) : (
            editais.map((e, i) => (
              <Fragment key={e.id}>
                <CardCompacto edital={e} agora={p.agora} aoSelecionar={() => p.aoSelecionar(e)} />
                {i === posicaoNoMeio(editais.length) ? p.noMeio : null}
              </Fragment>
            ))
          )}
          {vazia ? p.noMeio : null}
          {vazia || buscando ? null : (
            <FimDaLista total={total} mostrados={editais.length} carregando={p.carregandoMais} erro={p.erroMais} aoCarregarMais={p.aoCarregarMais} />
          )}
          <p className="shrink-0 px-1 pb-2 pt-1 text-center font-mono text-[11px] text-ink-muted">{FONTE_COBERTURA}</p>
        </div>
      </div>
    </>
  );
}
