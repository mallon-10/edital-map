'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import { resumirPontos } from '@/lib/painel';
import type { Cidade, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { Busca, type ValoresBusca } from './Busca';
import { GavetaCelular } from './GavetaCelular';
import { Lista } from './Lista';
import { Mapa } from './Mapa';

const VAZIO: ValoresBusca = { q: '', uf: '', seteDias: false };

const ERRO_LISTA = 'Não foi possível buscar agora. Confira a conexão e tente de novo.';
const ERRO_MAPA = 'Não foi possível carregar o mapa agora.';
const TEMPO_LIMITE_MS = 20_000;

function parametros(v: ValoresBusca, cidade: Cidade | null, deslocamento = 0): URLSearchParams {
  const p = new URLSearchParams();
  if (v.q.trim()) p.set('q', v.q.trim());
  if (v.uf) p.set('uf', v.uf);
  if (v.seteDias) p.set('dias', '7');
  if (cidade) p.set('ibge', cidade.ibge);
  if (deslocamento) p.set('deslocamento', String(deslocamento));
  return p;
}

/** Busca JSON da API. O erro lançado sempre traz texto em português: o da API, quando houver, ou o `padrao`. */
async function obter<T>(url: string, padrao: string): Promise<T> {
  let resposta: Response;
  try {
    // Sem prazo, uma busca travada deixaria o botão "Buscando…" desabilitado para sempre
    // (AbortSignal.timeout não existe em navegadores mais antigos: nesses, segue sem prazo).
    const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TEMPO_LIMITE_MS) : undefined;
    resposta = await fetch(url, { signal });
  } catch {
    throw new Error(padrao);
  }
  let corpo: unknown = null;
  try {
    corpo = await resposta.json();
  } catch {
    // página de erro que não é JSON (502 do servidor, por exemplo)
  }
  if (!resposta.ok) {
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
    throw new Error(typeof erro === 'string' && erro.trim() ? erro : padrao);
  }
  if (corpo === null) throw new Error(padrao);
  return corpo as T;
}

function mensagem(e: unknown, padrao: string): string {
  return e instanceof Error && e.message ? e.message : padrao;
}

export function Explorador({ inicial, agoraInicial }: { inicial: ResultadoBusca; agoraInicial: string }) {
  const [valores, setValores] = useState<ValoresBusca>(VAZIO);
  const [cidade, setCidade] = useState<Cidade | null>(null);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  // Numeração dos pedidos: só a resposta do pedido mais recente pode mudar a tela.
  const pedidoLista = useRef(0);
  const pedidoMapa = useRef(0);

  const carregarLista = useCallback(async (v: ValoresBusca, c: Cidade | null) => {
    const id = ++pedidoLista.current;
    setCarregandoLista(true);
    setCarregandoMais(false);
    try {
      const novo = await obter<ResultadoBusca>(`/api/busca?${parametros(v, c)}`, ERRO_LISTA);
      if (id !== pedidoLista.current) return;
      setResultado(novo);
      setAgora(new Date());
      setErroLista(null);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      setErroLista(mensagem(e, ERRO_LISTA));
      // No celular a gaveta recolhida não tem lugar para o aviso: abre para ele aparecer.
      setGavetaAberta(true);
    } finally {
      if (id === pedidoLista.current) setCarregandoLista(false);
    }
  }, []);

  const carregarMapa = useCallback(async (v: ValoresBusca) => {
    const id = ++pedidoMapa.current;
    try {
      const novos = await obter<PontoMapa[]>(`/api/mapa?${parametros(v, null)}`, ERRO_MAPA);
      if (id !== pedidoMapa.current) return;
      setPontos(novos);
      setErroMapa(null);
    } catch (e) {
      if (id !== pedidoMapa.current) return;
      setErroMapa(mensagem(e, ERRO_MAPA));
    }
  }, []);

  useEffect(() => {
    void carregarMapa(VAZIO);
  }, [carregarMapa]);

  function buscar(v: ValoresBusca) {
    setValores(v);
    setCidade(null);
    registrar('busca', { q: v.q.trim() || null, uf: v.uf || null, dias: v.seteDias ? 7 : null });
    void carregarLista(v, null);
    void carregarMapa(v);
  }

  const escolherCidade = useCallback(
    (c: Cidade) => {
      setCidade(c);
      setGavetaAberta(true);
      void carregarLista(valores, c);
    },
    [carregarLista, valores],
  );

  function tirarCidade() {
    setCidade(null);
    void carregarLista(valores, null);
  }

  async function carregarMais() {
    if (carregandoMais || carregandoLista) return;
    const id = pedidoLista.current;
    setCarregandoMais(true);
    try {
      const mais = await obter<ResultadoBusca>(`/api/busca?${parametros(valores, cidade, resultado.editais.length)}`, ERRO_LISTA);
      // Busca ou cidade mudou enquanto esperava: essa página não pertence mais à lista na tela.
      if (id !== pedidoLista.current) return;
      setResultado((anterior) => {
        const ids = new Set(anterior.editais.map((e) => e.id));
        return { total: mais.total, editais: [...anterior.editais, ...mais.editais.filter((e) => !ids.has(e.id))] };
      });
      setErroLista(null);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      setErroLista(mensagem(e, ERRO_LISTA));
    } finally {
      if (id === pedidoLista.current) setCarregandoMais(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:block">
      <div className="shrink-0 px-4 pb-3 pt-3 md:px-6 md:pb-0 md:pt-4">
        <Busca inicial={VAZIO} carregando={carregandoLista} aoBuscar={buscar} />
      </div>
      <main className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_440px] md:gap-6 md:px-6 md:py-4">
        <h1 className="sr-only">Editais abertos no mapa</h1>
        <section
          aria-label="Mapa"
          className="relative min-h-0 flex-1 overflow-hidden bg-sunken md:h-[72vh] md:min-h-[420px] md:flex-none md:rounded-lg"
        >
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={null} aoEscolherCidade={escolherCidade} />
          {erroMapa ? (
            <p
              role="alert"
              className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-sm bg-pin-soft px-3 py-2 text-xs text-pin-strong"
            >
              {erroMapa}
            </p>
          ) : null}
          <div className="absolute bottom-3 left-3 hidden max-w-[300px] rounded-md border border-line bg-raised px-3 py-2 text-xs leading-[18px] text-ink-muted md:block">
            <p><span className="mr-1.5 inline-block size-2.5 rounded-full bg-ink align-[-1px]" aria-hidden="true" />Grupo de municípios · número = editais abertos</p>
            <p><span className="mr-1.5 inline-block size-2.5 rounded-full bg-pin align-[-1px]" aria-hidden="true" />Município · clique para ver os editais</p>
            <p>O ponto é a sede do órgão, não o local de entrega.</p>
          </div>
        </section>
        <GavetaCelular aberta={gavetaAberta} aoAlternar={() => setGavetaAberta((a) => !a)}>
          <Lista
            resultado={resultado}
            agora={agora}
            cidade={cidade}
            carregandoLista={carregandoLista}
            carregandoMais={carregandoMais}
            erro={erroLista}
            recolhida={!gavetaAberta}
            aoTirarCidade={tirarCidade}
            aoCarregarMais={carregarMais}
          />
        </GavetaCelular>
      </main>
    </div>
  );
}
