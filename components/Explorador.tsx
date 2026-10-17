'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import type { Raio } from '@/lib/geo';
import { normalizarTela, paraParametros, recursosUsados } from '@/lib/filtros';
import { resumirPontos } from '@/lib/painel';
import type { Cidade, EditalResumo, FiltrosTela, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { GavetaCelular } from './GavetaCelular';
import { Mapa } from './Mapa';
import { BuscaPrincipal } from './inicio/BuscaPrincipal';
import { CartaoSelecionado } from './inicio/CartaoSelecionado';
import { Chips } from './inicio/Chips';
import { ColunaLista } from './inicio/ColunaLista';
import { OndeMaisCompram } from './inicio/OndeMaisCompram';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const ERRO_LISTA = 'Não foi possível buscar agora. Confira a conexão e tente de novo.';
const ERRO_MAPA = 'Não foi possível carregar o mapa agora.';
const TEMPO_LIMITE_MS = 20_000;

/** Busca JSON da API. O erro lançado sempre traz texto em português: o da API, quando houver, ou o `padrao`. */
async function obter<T>(url: string, padrao: string): Promise<T> {
  let resposta: Response;
  try {
    // Sem prazo, uma busca travada deixaria o botão "Buscando…" desabilitado para sempre.
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

const mensagem = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

type Props = { inicial: ResultadoBusca; agoraInicial: string; atualizadoEm: string | null };

export function Explorador({ inicial, agoraInicial, atualizadoEm }: Props) {
  const [filtros, setFiltros] = useState<FiltrosTela>(VAZIO);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  // Falso até o primeiro mapa chegar: antes disso o resumo (UFs, valor, municípios) ainda não existe.
  const [pontosProntos, setPontosProntos] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial.editais[0]?.id ?? null);
  const [resumoNoCelular, setResumoNoCelular] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  // Sede de cada município já visto no mapa: centro do círculo do raio (a cidade escolhida sempre veio de um ponto do mapa).
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
  // Numeração dos pedidos: só a resposta do pedido mais recente pode mudar a tela.
  const pedidoLista = useRef(0);
  const pedidoMapa = useRef(0);

  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
  const centro = filtros.cidade && filtros.raio ? centros[filtros.cidade.ibge] : undefined;
  const raioMapa = useMemo<Raio | null>(
    () => (centro && filtros.raio ? { lng: centro[0], lat: centro[1], km: filtros.raio } : null),
    [centro, filtros.raio],
  );

  const carregarLista = useCallback(async (f: FiltrosTela) => {
    const id = ++pedidoLista.current;
    setCarregandoLista(true);
    setCarregandoMais(false);
    try {
      const novo = await obter<ResultadoBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA);
      if (id !== pedidoLista.current) return;
      setResultado(novo);
      setSelecionadoId(novo.editais[0]?.id ?? null);
      setAgora(new Date());
      setErroLista(null);
      // O cartão escuro do celular só vale para o toque que o abriu, não para as buscas seguintes.
      setResumoNoCelular(false);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      setErroLista(mensagem(e, ERRO_LISTA));
      // No celular a gaveta recolhida não tem lugar para o aviso: abre para ele aparecer.
      setGavetaAberta(true);
    } finally {
      if (id === pedidoLista.current) setCarregandoLista(false);
    }
  }, []);

  const carregarMapa = useCallback(async (f: FiltrosTela) => {
    const id = ++pedidoMapa.current;
    try {
      const novos = await obter<PontoMapa[]>(`/api/mapa?${paraParametros(f, { comCidade: false })}`, ERRO_MAPA);
      if (id !== pedidoMapa.current) return;
      setPontos(novos);
      setCentros((anteriores) => {
        const todos = { ...anteriores };
        for (const p of novos) todos[p.codigo_ibge] = [p.lng, p.lat];
        return todos;
      });
      setPontosProntos(true);
      setErroMapa(null);
    } catch (e) {
      if (id !== pedidoMapa.current) return;
      setErroMapa(mensagem(e, ERRO_MAPA));
    }
  }, []);

  useEffect(() => {
    void carregarMapa(VAZIO);
  }, [carregarMapa]);

  /** Aplica filtros novos: a lista sempre; o mapa só quando muda o que ele recebe. Toda mudança conta como busca. */
  function aplicar(pedido: FiltrosTela) {
    // Sem município não há raio (trocar a UF ou tirar a cidade tira o raio também).
    const novo = normalizarTela(pedido);
    // O mapa recebe tudo menos a cidade sozinha; com raio, recebe a cidade e o raio.
    const mudouMapa = paraParametros(novo, { comCidade: false }).toString() !== paraParametros(filtros, { comCidade: false }).toString();
    setFiltros(novo);
    // Cidade nova (pelo mapa, pelo chip ou pelo painel): no celular a gaveta abre para mostrar a lista dela.
    if (novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge) setGavetaAberta(true);
    registrar('busca', { q: novo.q.trim() || null, uf: novo.uf || null, dias: novo.seteDias ? 7 : null });
    for (const recurso of recursosUsados(filtros, novo)) registrar('usou_recurso', { recurso });
    void carregarLista(novo);
    // Repetir a busca depois de um erro do mapa tenta o mapa de novo.
    if (mudouMapa || erroMapa !== null) void carregarMapa(novo);
  }

  // O Mapa guarda o callback numa ref atualizada a cada render: uma função comum basta.
  function escolherCidade(c: Cidade) {
    // Também abre quando a cidade já era a escolhida (a gaveta pode ter sido fechada), o que `aplicar` não cobre.
    setGavetaAberta(true);
    aplicar({ ...filtros, cidade: c });
  }

  function selecionar(e: EditalResumo) {
    setSelecionadoId(e.id);
    setResumoNoCelular(true);
  }

  async function carregarMais() {
    if (carregandoMais || carregandoLista) return;
    const id = pedidoLista.current;
    setCarregandoMais(true);
    try {
      const mais = await obter<ResultadoBusca>(`/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}`, ERRO_LISTA);
      // Busca ou filtro mudou enquanto esperava: essa página não pertence mais à lista na tela.
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 px-4 pt-3 lg:px-6 lg:pt-5">
        <BuscaPrincipal q={filtros.q} uf={filtros.uf} carregando={carregandoLista} aoBuscar={(q, uf) => aplicar({ ...filtros, q, uf, cidade: null })} />
        <Chips filtros={filtros} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={aplicar} />
      </div>
      <main className="flex min-h-0 flex-1 flex-col pt-3 lg:grid lg:grid-cols-[360px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pb-6 lg:pt-4">
        <h1 className="sr-only">Editais abertos no mapa</h1>
        <GavetaCelular aberta={gavetaAberta} aoAlternar={() => setGavetaAberta((a) => !a)}>
          {gavetaAberta && resumoNoCelular && selecionado ? (
            <div className="mb-3 shrink-0 lg:hidden">
              <CartaoSelecionado edital={selecionado} agora={agora} aoFechar={() => setResumoNoCelular(false)} />
            </div>
          ) : null}
          <ColunaLista
            resultado={resultado}
            agora={agora}
            painel={painel}
            painelPronto={pontosProntos}
            seteDias={filtros.seteDias}
            selecionadoId={selecionado?.id ?? null}
            carregandoLista={carregandoLista}
            carregandoMais={carregandoMais}
            erro={erroLista}
            recolhida={!gavetaAberta}
            cidade={filtros.cidade}
            raio={filtros.raio}
            parametrosBusca={paraParametros(filtros).toString()}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
            aoSelecionar={selecionar}
            aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
            aoCarregarMais={carregarMais}
          />
        </GavetaCelular>
        <section aria-label="Mapa" className="relative min-h-0 flex-1 overflow-hidden bg-raised lg:rounded-lg lg:border lg:border-line">
          <Mapa pontos={pontos} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} />
          {/* No celular a gaveta cobre este canto: a observação fica só no computador. */}
          <p className="pointer-events-none absolute bottom-2 left-2 z-10 hidden rounded-sm bg-raised/85 px-2 py-1 text-xs text-ink-muted lg:block">
            O ponto é a sede do órgão, não o local de entrega.
          </p>
          {erroMapa ? (
            <p role="alert" className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-sm bg-pin-soft px-3 py-2 text-xs text-pin-strong">
              {erroMapa}
            </p>
          ) : null}
        </section>
        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
          {selecionado ? <CartaoSelecionado edital={selecionado} agora={agora} /> : null}
          <OndeMaisCompram municipios={painel.topMunicipios} carregando={!pontosProntos} termo={filtros.q} aoEscolher={escolherCidade} />
        </aside>
      </main>
    </div>
  );
}
