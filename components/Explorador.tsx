'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import { publicarUso } from '@/lib/cliente/uso';
import { guardarUltimaBusca, guardarVolta, tomarVolta, type Volta } from '@/lib/cliente/volta';
import type { Raio } from '@/lib/geo';
import { buscaDoCampo, filtrosAtivos, normalizarTela, paraParametros, recursosUsados } from '@/lib/filtros';
import { LimiteAtingido, lerLimite, type Limite, type RespostaBusca } from '@/lib/limites';
import { resumirPontos } from '@/lib/painel';
import type { Cidade, EditalResumo, FiltrosTela, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { mesmaBusca, telaPelaRolagem, urlDaBusca, type Tela } from '@/lib/urlBusca';
import { BarraCelular } from './BarraCelular';
import { Mapa } from './Mapa';
import { BuscaPrincipal } from './inicio/BuscaPrincipal';
import { CartaoSelecionado } from './inicio/CartaoSelecionado';
import { Chips } from './inicio/Chips';
import { ColunaLista } from './inicio/ColunaLista';
import { FolhaFiltros } from './inicio/FolhaFiltros';
import { OndeMaisCompram } from './inicio/OndeMaisCompram';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const SEM_RESULTADO: ResultadoBusca = { total: 0, editais: [] };
const ERRO_LISTA = 'Não foi possível buscar agora. Confira a conexão e tente de novo.';
const ERRO_MAPA = 'Não foi possível carregar o mapa agora.';
const TEMPO_LIMITE_MS = 20_000;

/** Abaixo de lg (1024 px): uma página que rola, com o mapa em cima e a lista embaixo; a parte em que está entra no endereço. */
const ehCelular = () => window.matchMedia('(max-width: 1023px)').matches;
/** Rolagem suave, menos para quem pediu ao sistema menos movimento. */
const comportamento = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
/** Depois de um toque em Mapa ou Lista, a rolagem (suave) não decide o item ativo da barra enquanto anda. */
const ESPERA_ROLAGEM_MS = 1000;

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
    // Limite do grátis (402): a tela mostra o cartão dos planos, não um erro.
    const limite = lerLimite(resposta.status, corpo);
    if (limite) throw new LimiteAtingido(limite);
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
    throw new Error(typeof erro === 'string' && erro.trim() ? erro : padrao);
  }
  if (corpo === null) throw new Error(padrao);
  return corpo as T;
}

const mensagem = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

type Props = {
  filtrosIniciais: FiltrosTela;
  telaInicial: Tela;
  /** null quando a busca do endereço já bateu no limite do dia. */
  inicial: ResultadoBusca | null;
  limiteInicial: Limite | null;
  agoraInicial: string;
  atualizadoEm: string | null;
};

/** Parte do estado guardada ao sair da página (o resto da Volta é calculado na hora de guardar). */
type Guardavel = Pick<Volta, 'filtros' | 'resultado' | 'limite' | 'tela' | 'selecionadoId'>;

export function Explorador({ filtrosIniciais, telaInicial, inicial, limiteInicial, agoraInicial, atualizadoEm }: Props) {
  const [filtros, setFiltros] = useState<FiltrosTela>(filtrosIniciais);
  // Celular: a parte da página pedida por último (botão da barra, cidade escolhida, aviso ou limite na lista), guardada
  // no endereço (`tela=lista` abre a página rolada até a lista). Só muda por ação explícita, nunca pela rolagem.
  const [tela, setTela] = useState<Tela>(telaInicial);
  // Item aceso na barra de baixo: segue a rolagem. Fica fora do endereço: o replaceState do Next durante uma navegação
  // pendente (tocar num card e rolar um pouco) a descartaria.
  const [ativoBarra, setAtivoBarra] = useState<Tela>(telaInicial);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial ?? SEM_RESULTADO);
  const [limite, setLimite] = useState<Limite | null>(limiteInicial);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  // Falso até o primeiro mapa chegar: antes disso o resumo (UFs, valor, municípios) ainda não existe.
  const [pontosProntos, setPontosProntos] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial?.editais[0]?.id ?? null);
  const [folhaAberta, setFolhaAberta] = useState(false);
  // Sede de cada município já visto no mapa: centro do círculo do raio (a cidade escolhida sempre veio de um ponto do mapa).
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
  // Numeração dos pedidos: só a resposta do pedido mais recente pode mudar a tela.
  const pedidoLista = useRef(0);
  const pedidoMapa = useRef(0);
  // Para voltar do edital no mesmo lugar: a área da lista e a posição dela, a posição da página
  // (quando a página inteira rola), a busca do mapa e o estado da tela.
  const listaRef = useRef<HTMLDivElement>(null);
  const rolagem = useRef(0);
  const rolagemPendente = useRef<number | null>(null);
  const rolagemPagina = useRef(0);
  const rolagemPaginaPendente = useRef<number | null>(null);
  const filtrosDoMapa = useRef<FiltrosTela>(VAZIO);
  const paraGuardar = useRef<Guardavel | null>(null);
  // Celular: início da lista (alvo do botão Lista) e até quando a rolagem não decide o item ativo da barra.
  const inicioLista = useRef<HTMLElement>(null);
  const ignorarRolagemAte = useRef(0);

  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
  const centro = filtros.cidade && filtros.raio ? centros[filtros.cidade.ibge] : undefined;
  const raioMapa = useMemo<Raio | null>(
    () => (centro && filtros.raio ? { lng: centro[0], lat: centro[1], km: filtros.raio } : null),
    [centro, filtros.raio],
  );

  /** Troca a tela do celular e escreve a busca no endereço (sem recarregar a página nem criar entrada no histórico). */
  const trocarTela = useCallback((nova: Tela, f: FiltrosTela) => {
    setTela(nova);
    window.history.replaceState(null, '', urlDaBusca(f, nova));
  }, []);

  /** Celular: leva a página ao mapa (topo) ou ao início da lista. No computador as duas estão na tela: não rola. */
  const rolarPara = useCallback((t: Tela, jeito: ScrollBehavior = comportamento()) => {
    if (!ehCelular()) return;
    ignorarRolagemAte.current = Date.now() + ESPERA_ROLAGEM_MS;
    if (t === 'lista') inicioLista.current?.scrollIntoView({ behavior: jeito, block: 'start' });
    else window.scrollTo({ top: 0, behavior: jeito });
  }, []);

  /** Celular: vai ao mapa ou à lista (barra de baixo, cidade escolhida, aviso ou cartão do limite na lista). */
  const irPara = useCallback(
    (t: Tela, f: FiltrosTela) => {
      trocarTela(t, f);
      setAtivoBarra(t);
      rolarPara(t);
    },
    [trocarTela, rolarPara],
  );

  const carregarLista = useCallback(
    async (f: FiltrosTela) => {
      const id = ++pedidoLista.current;
      // Posições de uma volta do edital que ainda não foram aplicadas são da lista antiga: não valem para a nova.
      rolagemPendente.current = null;
      rolagemPaginaPendente.current = null;
      setCarregandoLista(true);
      setCarregandoMais(false);
      try {
        const novo = await obter<RespostaBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA);
        if (id !== pedidoLista.current) return;
        setResultado({ total: novo.total, editais: novo.editais });
        setLimite(null);
        if (novo.buscasUsadas !== null) publicarUso({ buscas: novo.buscasUsadas });
        setSelecionadoId(novo.editais[0]?.id ?? null);
        setAgora(new Date());
        setErroLista(null);
      } catch (e) {
        if (id !== pedidoLista.current) return;
        if (e instanceof LimiteAtingido) {
          // Busca nova além do limite do dia: o cartão dos planos no lugar da lista (o mapa fica com a última permitida).
          setLimite(e.limite);
          publicarUso({ buscas: e.limite.usados });
          setErroLista(null);
        } else {
          setErroLista(mensagem(e, ERRO_LISTA));
        }
        // No celular o aviso e o cartão aparecem na lista, embaixo do mapa: a página rola até eles.
        if (ehCelular()) irPara('lista', f);
      } finally {
        if (id === pedidoLista.current) setCarregandoLista(false);
      }
    },
    [irPara],
  );

  const carregarMapa = useCallback(async (f: FiltrosTela) => {
    const id = ++pedidoMapa.current;
    const anterior = filtrosDoMapa.current;
    filtrosDoMapa.current = f;
    try {
      // Os mesmos parâmetros da lista: a mesma busca no limite do dia (o servidor ignora a cidade sem raio no mapa).
      const novos = await obter<PontoMapa[]>(`/api/mapa?${paraParametros(f)}`, ERRO_MAPA);
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
      // Limite do dia: o mapa fica com a última busca permitida, sem aviso (o cartão aparece na lista).
      if (e instanceof LimiteAtingido) {
        filtrosDoMapa.current = anterior;
        return;
      }
      setErroMapa(mensagem(e, ERRO_MAPA));
    }
  }, []);

  // Estado que a página guarda ao sair (a limpeza do efeito de montagem não enxerga o estado novo).
  useEffect(() => {
    paraGuardar.current = { filtros, resultado, limite, tela, selecionadoId };
  }, [filtros, resultado, limite, tela, selecionadoId]);

  // Última busca, para os links Mapa e Lista da barra do celular nas outras páginas.
  useEffect(() => guardarUltimaBusca(urlDaBusca(filtros)), [filtros]);

  // Celular: a barra acende Mapa ou Lista conforme a parte da página que está na tela. Só o item aceso muda: nada de
  // `tela` nem de endereço (replaceState), que cancelaria uma ida ao edital ainda carregando. A volta do edital usa a
  // posição da página (rolagemPagina). Um quadro por vez; parado durante a rolagem pedida pela barra.
  useEffect(() => {
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const inicio = inicioLista.current;
      if (!inicio || !ehCelular() || Date.now() < ignorarRolagemAte.current) return;
      const raiz = document.documentElement;
      const nova = telaPelaRolagem({
        topoLista: inicio.getBoundingClientRect().top,
        alturaJanela: window.innerHeight,
        noFim: window.scrollY > 0 && window.scrollY + window.innerHeight >= raiz.scrollHeight - 2,
      });
      setAtivoBarra(nova);
    };
    const rolar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    window.addEventListener('scroll', rolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', rolar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  // Volta do edital: devolve a página e a lista às posições em que estavam (a lista, quando estiver visível).
  useEffect(() => {
    if (rolagemPaginaPendente.current !== null) {
      window.scrollTo(0, rolagemPaginaPendente.current);
      rolagemPaginaPendente.current = null;
    }
    const lista = listaRef.current;
    if (rolagemPendente.current === null || !lista || lista.clientHeight === 0) return;
    lista.scrollTop = rolagemPendente.current;
    rolagemPendente.current = null;
  }, [resultado, tela]);

  // Posição da página ao sair. A limpeza de um efeito de layout roda antes de o Next levar a página nova ao topo;
  // a do useEffect abaixo (que guarda a volta e vem depois desta) pode rodar já com a página nova na tela.
  useLayoutEffect(
    () => () => {
      rolagemPagina.current = window.scrollY;
    },
    [carregarMapa, filtrosIniciais, telaInicial, limiteInicial],
  );

  // Montagem: voltando do edital (mesmo endereço), restaura busca, lista, tela e posições; senão, vale o que o servidor
  // desenhou. Ao sair da página (ir ao edital, a outra aba), guarda o estado para a volta.
  useEffect(() => {
    const volta = tomarVolta(window.location.pathname + window.location.search);
    if (volta) {
      setFiltros(volta.filtros);
      setTela(volta.tela);
      setAtivoBarra(volta.tela);
      setResultado(volta.resultado);
      setLimite(volta.limite);
      setSelecionadoId(volta.selecionadoId);
      // Os prazos ("encerra em 2 dias") contam a partir de agora, não da hora em que a lista foi guardada.
      setAgora(new Date());
      rolagemPendente.current = volta.rolagem;
      rolagemPaginaPendente.current = volta.rolagemPagina ?? null;
      void carregarMapa(volta.filtrosMapa);
    } else {
      // Endereço canônico (ordem dos parâmetros, valores inválidos fora): a volta compara por ele.
      window.history.replaceState(null, '', urlDaBusca(filtrosIniciais, telaInicial));
      // Celular com `tela=lista` no endereço (botão Lista de outra página, link compartilhado): abre rolada até a lista.
      if (telaInicial === 'lista') rolarPara('lista', 'auto');
      // Mesmos parâmetros da busca que o servidor já contou (a lista veio pronta): o mapa não conta de novo.
      // Busca do endereço bloqueada pelo limite: o mapa do Brasil todo, que não conta.
      void carregarMapa(limiteInicial ? VAZIO : filtrosIniciais);
    }
    return () => {
      const atual = paraGuardar.current;
      if (!atual) return;
      guardarVolta({
        ...atual,
        endereco: urlDaBusca(atual.filtros, atual.tela),
        filtrosMapa: filtrosDoMapa.current,
        rolagem: rolagem.current,
        rolagemPagina: rolagemPagina.current,
      });
    };
  }, [carregarMapa, rolarPara, filtrosIniciais, telaInicial, limiteInicial]);

  /** Aplica filtros novos: a lista sempre; o mapa só quando muda o que ele recebe. Toda mudança conta como busca. */
  function aplicar(pedido: FiltrosTela, opcoes: { abrirLista?: boolean } = {}) {
    // Sem município não há raio (trocar a UF ou tirar a cidade tira o raio também).
    const novo = normalizarTela(pedido);
    // O mapa recebe tudo menos a cidade sozinha; com raio, recebe a cidade e o raio.
    const mudouMapa = paraParametros(novo, { comCidade: false }).toString() !== paraParametros(filtros, { comCidade: false }).toString();
    // Cidade nova (pelo mapa, pelo painel ou pela folha de Filtros): no celular a página rola até a lista dela.
    const cidadeNova = Boolean(novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge);
    setFiltros(novo);
    if ((opcoes.abrirLista || cidadeNova) && ehCelular()) irPara('lista', novo);
    else trocarTela(tela, novo);
    registrar('busca', { q: novo.q.trim() || null, uf: novo.uf || null, dias: novo.seteDias ? 7 : null });
    for (const recurso of recursosUsados(filtros, novo)) registrar('usou_recurso', { recurso });
    void carregarLista(novo);
    // Repetir a busca depois de um erro do mapa tenta o mapa de novo.
    if (mudouMapa || erroMapa !== null) void carregarMapa(novo);
  }

  // O Mapa guarda o callback numa ref atualizada a cada render: uma função comum basta.
  function escolherCidade(c: Cidade) {
    // Também rola até a lista quando a cidade já era a escolhida, o que `cidadeNova` não cobre.
    aplicar({ ...filtros, cidade: c }, { abrirLista: true });
  }

  const fecharFolha = useCallback(() => setFolhaAberta(false), []);

  /** Computador: o card selecionado aparece no resumo da direita (no celular, tocar no card abre o edital). */
  function selecionar(e: EditalResumo) {
    setSelecionadoId(e.id);
  }

  async function carregarMais() {
    if (carregandoMais || carregandoLista) return;
    const id = pedidoLista.current;
    setCarregandoMais(true);
    try {
      const mais = await obter<RespostaBusca>(`/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}`, ERRO_LISTA);
      // Busca ou filtro mudou enquanto esperava: essa página não pertence mais à lista na tela.
      if (id !== pedidoLista.current) return;
      setResultado((anterior) => {
        const ids = new Set(anterior.editais.map((e) => e.id));
        return { total: mais.total, editais: [...anterior.editais, ...mais.editais.filter((e) => !ids.has(e.id))] };
      });
      setErroLista(null);
    } catch (e) {
      if (id !== pedidoLista.current) return;
      if (e instanceof LimiteAtingido) {
        setLimite(e.limite);
        publicarUso({ buscas: e.limite.usados });
      } else setErroLista(mensagem(e, ERRO_LISTA));
    } finally {
      if (id === pedidoLista.current) setCarregandoMais(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Espaço entre a busca e os chips só a partir de lg: no celular os chips ficam escondidos (estão na folha). */}
      <div className="shrink-0 px-4 pt-3 lg:space-y-3 lg:px-6 lg:pt-5">
        <BuscaPrincipal
          q={filtros.q}
          uf={filtros.uf}
          carregando={carregandoLista}
          filtrosAtivos={filtrosAtivos(filtros)}
          // Celular: o campo não mostra o lugar, então município e raio continuam enquanto a UF for a mesma.
          aoBuscar={(q, uf) => aplicar(buscaDoCampo(filtros, q, uf, { manterCidade: ehCelular() }))}
          aoAbrirFiltros={() => setFolhaAberta(true)}
        />
        {/* Celular: os chips ficam na folha de Filtros. */}
        <div className="hidden lg:block">
          <Chips filtros={filtros} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={aplicar} />
        </div>
      </div>
      {/* Celular: uma página que rola, com o mapa (altura fixa) em cima e a lista embaixo, no fluxo.
          Computador: três colunas (lista, mapa, resumo) na altura da tela, cada uma rolando por dentro. */}
      <main className="flex flex-col pt-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pb-6 lg:pt-4">
        <h1 className="sr-only">Editais abertos no mapa</h1>
        <section
          aria-label="Lista de editais"
          id="lista-editais"
          ref={inicioLista}
          className="flex scroll-mt-3 flex-col px-4 pb-4 pt-4 lg:min-h-0 lg:overflow-hidden lg:p-0"
        >
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
            limite={limite}
            cidade={filtros.cidade}
            raio={filtros.raio}
            parametrosBusca={paraParametros(filtros).toString()}
            listaRef={listaRef}
            aoRolar={(topo) => {
              rolagem.current = topo;
            }}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
            aoSelecionar={selecionar}
            aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
            aoCarregarMais={carregarMais}
          />
        </section>
        {/* Celular: primeiro na página, com 58svh (pinça e um dedo mexem no mapa; fora dele, arrastar rola a página). */}
        <section aria-label="Mapa" className="relative order-first h-[58svh] min-h-0 shrink-0 overflow-hidden bg-raised lg:order-none lg:h-auto lg:rounded-lg lg:border lg:border-line">
          <Mapa pontos={pontos} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} />
          {/* No celular a observação fica embaixo do mapa, no começo da lista. */}
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
      <FolhaFiltros
        aberta={folhaAberta}
        filtros={filtros}
        pontos={pontos}
        atualizadoEm={atualizadoEm}
        agora={agora}
        // Aplicar sem mudar nada só fecha (não refaz a busca).
        aoAplicar={(f) => {
          if (!mesmaBusca(f, filtros)) aplicar(f);
        }}
        aoFechar={fecharFolha}
      />
      <BarraCelular ativo={ativoBarra} aoTrocarTela={(t) => irPara(t, filtros)} />
    </div>
  );
}
