'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { trocarEndereco } from '@/lib/cliente/endereco';
import { registrar } from '@/lib/cliente/registrar';
import { guardarUltimaBusca, guardarVolta, tomarVolta, type Volta } from '@/lib/cliente/volta';
import type { Raio } from '@/lib/geo';
import { buscaDoCampo, filtrosAtivos, normalizarTela, ordemEfetiva, paraParametros, recursosUsados } from '@/lib/filtros';
import { PainelCnpj } from '@/components/cnpj/PainelCnpj';
import { consultarCnpj, type RespostaCnpj } from '@/lib/cliente/cnpj';
import { medir } from '@/lib/cliente/medir';
import { rastrear } from '@/lib/cliente/rastrear';
import { hrefAlertaDaBusca } from '@/lib/alertaDaBusca';
import { moedaCurta } from '@/lib/formato';
import { juntarEditais, precisaRealinhar, proximaPagina, temMais, textoDoResultado, tituloDaBusca } from '@/lib/inicio';
import { ofertaDaBusca } from '@/lib/ofertaBusca';
import { segmentoDaBusca } from '@/lib/rastreio';
import { urlDosPontos } from '@/lib/pontosMapa';
import { resumirPontos } from '@/lib/painel';
import { temTermo } from '@/lib/relevancia/termos';
import type { Cidade, EditalResumo, FiltrosTela, Ordem, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { mesmaBusca, telaPelaRolagem, urlDaBusca, type EstadoTela, type Tela, type Vista } from '@/lib/urlBusca';
import { BarraCelular } from './BarraCelular';
import { FaixaOferta } from './FaixaOferta';
import { Mapa } from './Mapa';
import { CartaoAssessoria } from './edital/CartaoAssessoria';
import { Atalhos, AtalhosComTotais } from './inicio/Atalhos';
import { BuscaPrincipal } from './inicio/BuscaPrincipal';
import { CartaoTopo } from './inicio/CartaoTopo';
import { Chips } from './inicio/Chips';
import { ColunaLista } from './inicio/ColunaLista';
import { FolhaFiltros } from './inicio/FolhaFiltros';
import { IconeExpandir, IconeRecolher } from './inicio/Icones';
import { OfertaBusca } from './inicio/OfertaBusca';
import { OndeMaisCompram } from './inicio/OndeMaisCompram';
import { ValorEmJogo } from './inicio/ValorEmJogo';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
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
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
    throw new Error(typeof erro === 'string' && erro.trim() ? erro : padrao);
  }
  if (corpo === null) throw new Error(padrao);
  return corpo as T;
}

const mensagem = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

/** Evento "busca" com o total achado (null: a busca falhou). */
function registrarBusca(f: FiltrosTela, total: number | null) {
  registrar('busca', { q: f.q.trim() || null, uf: f.uf || null, dias: f.seteDias ? 7 : null, total });
  const parametros = { segmento: segmentoDaBusca(f.q), uf: f.uf || null };
  rastrear('search_performed', parametros);
  if (total !== null) rastrear('search_results_viewed', { ...parametros, resultados: total });
}

type Props = {
  filtrosIniciais: FiltrosTela;
  /** Vista, parte do celular, página e ordem lidas do endereço. */
  estadoInicial: EstadoTela;
  /** Lista da busca do endereço, já consultada no servidor. */
  inicial: ResultadoBusca;
  agoraInicial: string;
  atualizadoEm: string | null;
  /** Cartão da oferta do Pro embaixo do cartão do topo (mostrarOferta, decidido no servidor). */
  oferta: boolean;
  /** Editais abertos no Brasil de cada atalho de assunto (slug → total ou null), chegando depois do HTML. */
  totaisAtalhos: Promise<Record<string, number | null>>;
  /** Pontos do mapa da busca do endereço, chegando depois do HTML (null: sem filtros, vêm da CDN, ou falhou). */
  pontosIniciais: Promise<PontoMapa[] | null> | null;
  /** Triagem da assessoria (null: número do WhatsApp não configurado, sem cartão). */
  assessoria: string | null;
};

// Cartão da assessoria na página inicial (sem edital escolhido).
const TITULO_ASSESSORIA = 'Encontrou uma licitação e não sabe como participar?';
const TEXTO_ASSESSORIA = 'Ajudamos a entender o edital, os documentos e os próximos passos.';
const BOTAO_ASSESSORIA = 'Quero orientação';

/** Parte do estado guardada ao sair da página (o resto da Volta é calculado na hora de guardar). */
type Guardavel = Pick<Volta, 'filtros' | 'resultado' | 'tela' | 'selecionadoId'>;

export function Explorador({ filtrosIniciais, estadoInicial, inicial, agoraInicial, atualizadoEm, oferta, totaisAtalhos, pontosIniciais, assessoria }: Props) {
  const [filtros, setFiltros] = useState<FiltrosTela>(filtrosIniciais);
  // Celular: a parte da página pedida por último (botão da barra, cidade escolhida ou aviso na lista), guardada
  // no endereço (`tela=lista` abre a página rolada até a lista). Só muda por ação explícita, nunca pela rolagem.
  const [tela, setTela] = useState<Tela>(estadoInicial.tela);
  // Lista ou Mapa (alternador no topo dos resultados), página e ordem da lista: vão no endereço e não contam como busca.
  const [vista, setVista] = useState<Vista>(estadoInicial.vista);
  // Lista que carrega ao rolar: a primeira página que o endereço pediu (as seguintes se juntam embaixo, fora do endereço).
  const primeiraPagina = useRef(estadoInicial.pagina);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem | null>(estadoInicial.ordem);
  // Item aceso na barra de baixo: segue a rolagem. Fica fora do endereço: o replaceState do Next durante uma navegação
  // pendente (tocar num card e rolar um pouco) a descartaria.
  const [ativoBarra, setAtivoBarra] = useState<Tela>(estadoInicial.vista === 'lista' ? 'lista' : estadoInicial.tela);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial);
  // Última busca já respondida: a oferta só muda com o resultado na tela (nunca com um total velho, nem ao trocar a ordem).
  const [buscaPronta, setBuscaPronta] = useState<{ filtros: FiltrosTela; total: number } | null>({ filtros: filtrosIniciais, total: inicial.total });
  // Campo da busca com um CNPJ: a empresa e os segmentos aparecem embaixo da barra (a busca só roda em "Ver editais").
  const [cnpj, setCnpj] = useState<
    { estado: 'carregando' } | { estado: 'erro'; erro: string } | { estado: 'ok'; r: RespostaCnpj } | null
  >(null);
  const verCnpj = useCallback(async (numero: string) => {
    setCnpj({ estado: 'carregando' });
    try {
      setCnpj({ estado: 'ok', r: await consultarCnpj(numero) });
    } catch (falha) {
      setCnpj({ estado: 'erro', erro: falha instanceof Error ? falha.message : 'Não deu para consultar o CNPJ agora.' });
    }
  }, []);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [erroMapa, setErroMapa] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);
  // Falso até o primeiro mapa chegar: antes disso o resumo (UFs, valor, municípios) ainda não existe.
  const [pontosProntos, setPontosProntos] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial.editais[0]?.id ?? null);
  const [folhaAberta, setFolhaAberta] = useState(false);
  // Mapa em tela cheia (botão no canto do mapa; Esc ou o mesmo botão saem).
  const [mapaCheio, setMapaCheio] = useState(false);
  // Erro do Exportar (o botão fica no cartão do topo, o aviso na lista); some quando a busca muda.
  const [erroExportar, setErroExportar] = useState<string | null>(null);
  // Falso até o primeiro filtro mudado pelo usuário: o foco do mapa na abertura (link direto, volta do edital) não anima.
  const [animarFoco, setAnimarFoco] = useState(false);
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
  const rolarDepois = useRef(false);
  // O que vai no endereço além dos filtros (vista, tela, página, ordem), sempre o mais recente (callbacks antigos leem daqui).
  const estadoAtual = useRef<EstadoTela>(estadoInicial);
  /** Escreve a busca no endereço com o estado atual mais as mudanças (sem recarregar nem criar entrada no histórico). */
  const escreverEndereco = useCallback((f: FiltrosTela, mudancas: Partial<EstadoTela> = {}) => {
    estadoAtual.current = { ...estadoAtual.current, ...mudancas };
    trocarEndereco(urlDaBusca(f, estadoAtual.current));
  }, []);

  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const parametrosBusca = paraParametros(filtros, { ordem }).toString();
  useEffect(() => setErroExportar(null), [parametrosBusca]);
  const valorTotal = moedaCurta(painel.valorTotal);
  const resumo = pontosProntos
    ? `${valorTotal ? `${valorTotal} em valor estimado` : 'Valor não informado'} · ${painel.ufs} ${painel.ufs === 1 ? 'UF' : 'UFs'}`
    : 'Carregando o resumo…';
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
  const comTermo = temTermo(filtros.q);
  // Com termo, a oferta fala da busca e vem no topo dos resultados, no lugar da faixa genérica: nunca as duas.
  const ofertaBuscada = oferta && buscaPronta ? ofertaDaBusca(buscaPronta.filtros, buscaPronta.total) : null;
  const naLista = vista === 'lista';
  // Sede do município filtrado (com ou sem raio): o mapa vai até ela; com raio, ela é o centro do círculo.
  const centro = filtros.cidade ? centros[filtros.cidade.ibge] : undefined;
  const sedeMapa = centro ?? null;
  const raioMapa = useMemo<Raio | null>(
    () => (centro && filtros.raio ? { lng: centro[0], lat: centro[1], km: filtros.raio } : null),
    [centro, filtros.raio],
  );

  /** Troca a tela do celular e escreve a busca no endereço (sem recarregar a página nem criar entrada no histórico). */
  const trocarTela = useCallback(
    (nova: Tela, f: FiltrosTela) => {
      setTela(nova);
      escreverEndereco(f, { tela: nova });
    },
    [escreverEndereco],
  );

  /** Celular: leva a página ao mapa (topo) ou ao início da lista. No computador as duas estão na tela: não rola. */
  const rolarPara = useCallback((t: Tela, jeito: ScrollBehavior = comportamento()) => {
    if (!ehCelular()) return;
    ignorarRolagemAte.current = Date.now() + ESPERA_ROLAGEM_MS;
    if (t === 'lista') inicioLista.current?.scrollIntoView({ behavior: jeito, block: 'start' });
    else window.scrollTo({ top: 0, behavior: jeito });
  }, []);

  /** Celular: vai ao mapa ou à lista (barra de baixo, cidade escolhida ou aviso na lista). */
  const irPara = useCallback(
    (t: Tela, f: FiltrosTela) => {
      trocarTela(t, f);
      setAtivoBarra(t);
      rolarPara(t);
    },
    [trocarTela, rolarPara],
  );

  // A faixa geral sai do topo junto com a busca e muda a altura da página: rolar antes do desenho passaria do ponto.
  useEffect(() => {
    if (!rolarDepois.current) return;
    rolarDepois.current = false;
    if (ehCelular()) rolarPara('lista');
    else inicioLista.current?.scrollIntoView({ behavior: comportamento(), block: 'start' });
  }, [filtros, rolarPara]);

  const carregarLista = useCallback(
    /** 'ok', 'erro' (falha) ou 'velho' (um pedido mais novo tomou o lugar: esta resposta não vale). */
    /** `aoTerminar`: total achado (null se falhou); não roda quando um pedido mais novo tomou o lugar. */
    async (
      f: FiltrosTela,
      lista: { pagina?: number; ordem?: Ordem | null; aoTerminar?: (total: number | null) => void } = {},
    ): Promise<'ok' | 'erro' | 'velho'> => {
      const id = ++pedidoLista.current;
      // Posições de uma volta do edital que ainda não foram aplicadas são da lista antiga: não valem para a nova.
      rolagemPendente.current = null;
      rolagemPaginaPendente.current = null;
      setCarregandoLista(true);
      setErroMais(null);
      try {
        const ordemPedida = lista.ordem === undefined ? estadoAtual.current.ordem : lista.ordem;
        const novo = await obter<ResultadoBusca>(`/api/busca?${paraParametros(f, { pagina: lista.pagina ?? 1, ordem: ordemPedida })}`, ERRO_LISTA);
        if (id !== pedidoLista.current) return 'velho';
        setResultado({ total: novo.total, editais: novo.editais });
        lista.aoTerminar?.(novo.total);
        if (f.q.trim()) medir('buscou', { chave: 'dia' });
        setSelecionadoId(novo.editais[0]?.id ?? null);
        setAgora(new Date());
        setErroLista(null);
        return 'ok';
      } catch (e) {
        if (id !== pedidoLista.current) return 'velho';
        lista.aoTerminar?.(null);
        setErroLista(mensagem(e, ERRO_LISTA));
        // No celular o aviso aparece na lista, embaixo do mapa: a página rola até ele.
        if (ehCelular()) irPara('lista', f);
        return 'erro';
      } finally {
        if (id === pedidoLista.current) setCarregandoLista(false);
      }
    },
    [irPara],
  );

  /** `pronto`: os pontos que o servidor já mandou com a página (sem eles, ou se falharam, pede a /api/mapa). */
  const carregarMapa = useCallback(async (f: FiltrosTela, pronto?: Promise<PontoMapa[] | null> | null) => {
    const id = ++pedidoMapa.current;
    filtrosDoMapa.current = f;
    try {
      // Os mesmos parâmetros da lista (o servidor ignora a cidade sem raio no mapa).
      // A promessa que vem do servidor é a do React: o `.catch()` dela não devolve outra promessa, então `await` com try.
      let daPagina: PontoMapa[] | null = null;
      if (pronto) {
        try {
          daPagina = await pronto;
        } catch {
          daPagina = null;
        }
      }
      const novos = daPagina ?? (await obter<PontoMapa[]>(urlDosPontos(paraParametros(f)), ERRO_MAPA));
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

  // Estado que a página guarda ao sair (a limpeza do efeito de montagem não enxerga o estado novo).
  useEffect(() => {
    paraGuardar.current = { filtros, resultado, tela, selecionadoId };
  }, [filtros, resultado, tela, selecionadoId]);

  // Última busca, para os links Mapa e Lista da barra do celular nas outras páginas.
  useEffect(() => guardarUltimaBusca(urlDaBusca(filtros, { ordem })), [filtros, ordem]);

  // Celular: a barra acende Mapa ou Lista conforme a parte da página que está na tela. Só o item aceso muda: nada de
  // `tela` nem de endereço (replaceState), que cancelaria uma ida ao edital ainda carregando. A volta do edital usa a
  // posição da página (rolagemPagina). Um quadro por vez; parado durante a rolagem pedida pela barra.
  useEffect(() => {
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const inicio = inicioLista.current;
      if (!inicio || !ehCelular() || Date.now() < ignorarRolagemAte.current) return;
      // Vista Lista: não há mapa na página; a barra fica em Lista.
      if (estadoAtual.current.vista === 'lista') return;
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

  // Mapa em tela cheia: a página de baixo não rola e Esc sai.
  useEffect(() => {
    if (!mapaCheio) return;
    const raiz = document.documentElement;
    const overflow = raiz.style.overflow;
    raiz.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMapaCheio(false);
    };
    document.addEventListener('keydown', tecla);
    return () => {
      raiz.style.overflow = overflow;
      document.removeEventListener('keydown', tecla);
    };
  }, [mapaCheio]);

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
    [carregarMapa, filtrosIniciais, estadoInicial],
  );

  // Montagem: voltando do edital (mesmo endereço), restaura busca, lista, tela e posições; senão, vale o que o servidor
  // desenhou. Ao sair da página (ir ao edital, a outra aba), guarda o estado para a volta.
  useEffect(() => {
    const volta = tomarVolta(window.location.pathname + window.location.search);
    if (volta) {
      setFiltros(volta.filtros);
      setTela(volta.tela);
      estadoAtual.current = { ...estadoAtual.current, tela: volta.tela };
      setAtivoBarra(estadoAtual.current.vista === 'lista' ? 'lista' : volta.tela);
      setResultado(volta.resultado);
      setBuscaPronta({ filtros: volta.filtros, total: volta.resultado.total });
      setSelecionadoId(volta.selecionadoId);
      // Os prazos ("encerra em 2 dias") contam a partir de agora, não da hora em que a lista foi guardada.
      setAgora(new Date());
      rolagemPendente.current = volta.rolagem;
      rolagemPaginaPendente.current = volta.rolagemPagina ?? null;
      void carregarMapa(volta.filtrosMapa);
    } else {
      // Endereço canônico (ordem dos parâmetros, valores inválidos fora): a volta compara por ele.
      trocarEndereco(urlDaBusca(filtrosIniciais, estadoInicial));
      // Celular com `tela=lista` no endereço (botão Lista de outra página, link compartilhado): abre rolada até a lista.
      if (estadoInicial.tela === 'lista') rolarPara('lista', 'auto');
      // Busca que chegou pronta no endereço (link do CNPJ, anúncio, compartilhada): conta, com o total do servidor.
      if (filtrosIniciais.q.trim()) registrarBusca(filtrosIniciais, inicial.total);
      // A lista veio pronta do servidor; os pontos da mesma busca vêm com a página (ou da CDN, sem filtros).
      void carregarMapa(filtrosIniciais, pontosIniciais);
    }
    return () => {
      const atual = paraGuardar.current;
      if (!atual) return;
      guardarVolta({
        ...atual,
        endereco: urlDaBusca(atual.filtros, { ...estadoAtual.current, tela: atual.tela }),
        filtrosMapa: filtrosDoMapa.current,
        rolagem: rolagem.current,
        rolagemPagina: rolagemPagina.current,
      });
    };
  }, [carregarMapa, rolarPara, filtrosIniciais, estadoInicial, inicial.total, pontosIniciais]);

  /** Depois do desenho da resposta: o que vem antes da lista pode ter mudado de altura. */
  function realinharLista() {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const lista = inicioLista.current;
        if (lista && precisaRealinhar(lista.getBoundingClientRect().top)) lista.scrollIntoView({ block: 'start' });
      }),
    );
  }

  /** Aplica filtros novos: a lista sempre; o mapa só quando muda o que ele recebe. Toda mudança respondida grava o evento "busca". */
  function aplicar(pedido: FiltrosTela, opcoes: { abrirLista?: boolean; rolar?: boolean } = {}) {
    // Sem município não há raio (trocar a UF ou tirar a cidade tira o raio também).
    const novo = normalizarTela(pedido);
    // O mapa recebe tudo menos a cidade sozinha; com raio, recebe a cidade e o raio.
    const mudouMapa = paraParametros(novo, { comCidade: false }).toString() !== paraParametros(filtros, { comCidade: false }).toString();
    // Cidade nova (pelo mapa, pelo painel ou pela folha de Filtros): no celular a página rola até a lista dela.
    const cidadeNova = Boolean(novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge);
    setFiltros(novo);
    setAnimarFoco(true);
    // Filtro novo começa na página 1 (a ordem escolhida fica).
    primeiraPagina.current = 1;
    estadoAtual.current = { ...estadoAtual.current, pagina: 1 };
    if (opcoes.rolar) {
      // Quem pediu uma busca vai aos resultados nas duas larguras; a rolagem sai depois do desenho (efeito abaixo).
      rolarDepois.current = true;
      trocarTela(ehCelular() ? 'lista' : tela, novo);
      if (ehCelular()) setAtivoBarra('lista');
    } else if ((opcoes.abrirLista || cidadeNova) && ehCelular()) irPara('lista', novo);
    else trocarTela(tela, novo);
    for (const recurso of recursosUsados(filtros, novo)) registrar('usou_recurso', { recurso });
    void carregarLista(novo, {
      aoTerminar: (total) => {
        registrarBusca(novo, total);
        setBuscaPronta(total === null ? null : { filtros: novo, total });
        if (opcoes.rolar && total !== null) realinharLista();
      },
    });
    // Repetir a busca depois de um erro do mapa tenta o mapa de novo.
    if (mudouMapa || erroMapa !== null) void carregarMapa(novo);
  }

  // O Mapa guarda o callback numa ref atualizada a cada render: uma função comum basta.
  function escolherCidade(c: Cidade) {
    // Também rola até a lista quando a cidade já era a escolhida, o que `cidadeNova` não cobre.
    aplicar({ ...filtros, cidade: c }, { abrirLista: true });
  }

  const fecharFolha = useCallback(() => setFolhaAberta(false), []);

  /** Atalho de assunto: busca o termo com os filtros de agora (como digitar no campo). */
  function escolherAtalho(termo: string) {
    aplicar({ ...filtros, q: termo }, { rolar: true });
  }

  /** Mouse sobre um card (computador): o ponto dele acende no mapa. Clicar abre o edital. */
  function selecionar(e: EditalResumo) {
    setSelecionadoId(e.id);
  }

  /** "Ver os N editais" do cartão do topo: leva à lista (no celular, também acende Lista na barra). */
  function verEditais() {
    if (ehCelular()) irPara('lista', filtros);
    else inicioLista.current?.scrollIntoView({ behavior: comportamento(), block: 'start' });
  }

  /**
   * Lista | Mapa: troca a tela e escreve a vista no endereço (uma escrita). Não busca de novo: os pontos
   * do mapa já estão carregados; se o mapa tinha falhado (ou não chegou), ir ao Mapa pede de novo a mesma busca dele.
   */
  function mudarVista(v: Vista) {
    if (v === vista) return;
    setVista(v);
    // Na Lista a "tela" do celular não existe (fica como está); no Mapa a página começa no mapa.
    if (v === 'mapa') setTela('mapa');
    escreverEndereco(filtros, v === 'mapa' ? { vista: v, tela: 'mapa' } : { vista: v });
    setAtivoBarra(v === 'lista' ? 'lista' : 'mapa');
    if (ehCelular()) {
      ignorarRolagemAte.current = Date.now() + ESPERA_ROLAGEM_MS;
      window.scrollTo({ top: 0 });
    }
    if (v === 'mapa' && (erroMapa !== null || !pontosProntos)) void carregarMapa(filtrosDoMapa.current);
  }

  /** Barra do celular: Mapa leva ao topo (e liga o mapa se estava na vista Lista); Lista rola até o começo da lista. */
  function aoBarra(t: Tela) {
    if (t === 'mapa') {
      if (vista !== 'mapa') mudarVista('mapa');
      else irPara('mapa', filtros);
    } else {
      irPara('lista', filtros);
    }
  }

  /**
   * Fim da lista na tela (ou "Carregar mais"): acrescenta a próxima página da mesma busca, sem repetir. Não grava o evento
   * "busca", não muda o mapa nem o endereço (a volta do edital guarda a lista inteira). Uma busca nova no meio do caminho
   * descarta esta resposta.
   */
  async function carregarMais() {
    if (carregandoMais || carregandoLista || !temMais(resultado)) return;
    const pedido = pedidoLista.current;
    setCarregandoMais(true);
    setErroMais(null);
    try {
      const pagina = proximaPagina(primeiraPagina.current, resultado.editais.length);
      const novo = await obter<ResultadoBusca>(`/api/busca?${paraParametros(filtros, { pagina, ordem: estadoAtual.current.ordem })}`, ERRO_LISTA);
      if (pedido !== pedidoLista.current) return;
      setResultado((r) => ({ total: novo.total, editais: juntarEditais(r.editais, novo.editais) }));
    } catch (e) {
      if (pedido === pedidoLista.current) setErroMais(mensagem(e, ERRO_LISTA));
    } finally {
      setCarregandoMais(false);
    }
  }

  /** Outra ordem da mesma busca: recomeça da página 1; não grava o evento "busca"; o mapa não muda. */
  async function mudarOrdem(o: Ordem) {
    const antes = { ordem, pagina: primeiraPagina.current };
    setOrdem(o);
    primeiraPagina.current = 1;
    escreverEndereco(filtros, { ordem: o, pagina: 1 });
    // Falhou: a lista na tela é a da ordem anterior; o seletor e o endereço voltam para ela.
    if ((await carregarLista(filtros, { pagina: 1, ordem: o })) === 'erro') {
      setOrdem(antes.ordem);
      primeiraPagina.current = antes.pagina;
      escreverEndereco(filtros, { ordem: antes.ordem, pagina: antes.pagina });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Espaço entre a busca e os chips só a partir de lg: no celular os chips ficam escondidos (estão na folha). */}
      <div className="mx-auto w-full max-w-[1200px] shrink-0 px-4 pt-1 lg:space-y-3 lg:px-6 lg:pt-2">
        <BuscaPrincipal
          q={filtros.q}
          uf={filtros.uf}
          carregando={carregandoLista}
          filtrosAtivos={filtrosAtivos(filtros)}
          // Celular: o campo não mostra o lugar, então município e raio continuam enquanto a UF for a mesma.
          aoBuscar={(q, uf) => aplicar(buscaDoCampo(filtros, q, uf, { manterCidade: ehCelular() }), { rolar: true })}
          aoCnpj={verCnpj}
          aoAbrirFiltros={() => setFolhaAberta(true)}
        />
        {cnpj ? (
          <div className="relative mt-3">
            {cnpj.estado === 'carregando' ? (
              <p role="status" className="rounded-[22px] bg-raised p-5 text-sm text-ink-muted">Consultando o CNPJ na Receita…</p>
            ) : cnpj.estado === 'erro' ? (
              <p role="alert" className="rounded-[22px] bg-pin-soft p-5 pr-12 text-sm text-pin-strong">{cnpj.erro}</p>
            ) : (
              <PainelCnpj
                key={cnpj.r.empresa.razao}
                r={cnpj.r}
                aoVer={(q, uf) => {
                  setCnpj(null);
                  aplicar(buscaDoCampo(filtros, q, uf, { manterCidade: false }), { rolar: true });
                }}
              />
            )}
            <button
              type="button"
              onClick={() => setCnpj(null)}
              aria-label="Fechar"
              className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-lg text-ink-muted hover:bg-sunken"
            >
              ×
            </button>
          </div>
        ) : null}
        {/* Celular: os chips ficam na folha de Filtros. */}
        <div className="hidden lg:block">
          <Chips filtros={filtros} pontos={pontos} aoMudar={aplicar} />
        </div>
      </div>
      {/* Uma página que rola, nas duas larguras: o cartão do topo (resumo e mapa), a oferta, os assuntos e a lista.
          Computador: a lista e, ao lado, o valor e "Onde mais compram" (presos na tela). Vista Lista: o cartão sem o mapa. */}
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pb-8 pt-4 lg:gap-7 lg:px-6 lg:pt-5">
        <CartaoTopo
          titulo={tituloDaBusca(filtros)}
          total={resultado.total}
          carregando={carregandoLista}
          resumo={resumo}
          atualizadoEm={atualizadoEm}
          agora={agora}
          parametrosBusca={parametrosBusca}
          aoErroExportar={setErroExportar}
          aoVerEditais={verEditais}
          aoMostrarMapa={() => mudarVista('mapa')}
          hrefAlerta={hrefAlertaDaBusca(filtros)}
        >
          {/* Celular: em cima no cartão, com 46svh (pinça e um dedo mexem no mapa; fora dele, arrastar rola a página).
              Computador: a metade direita do cartão. Tela cheia: o mapa cobre a página. */}
          {naLista ? null : (
            <section
              aria-label="Mapa"
              className={
                mapaCheio
                  ? 'fixed inset-0 z-50 h-dvh overflow-hidden bg-[#f8f6f0]'
                  : 'relative order-first h-[46svh] min-h-[280px] shrink-0 overflow-hidden bg-[#f8f6f0] lg:order-last lg:h-auto lg:min-h-[460px] lg:flex-[1_1_56%]'
              }
            >
              <Mapa pontos={pontos} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} sede={sedeMapa} animarFoco={animarFoco} />
              <button
                type="button"
                onClick={() => setMapaCheio((v) => !v)}
                aria-label={mapaCheio ? 'Sair da tela cheia' : 'Abrir o mapa em tela cheia'}
                title={mapaCheio ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
                className="absolute left-3 top-3 z-10 flex size-11 items-center justify-center rounded-full border border-line bg-raised text-ink hover:bg-sunken lg:left-5 lg:top-5 lg:size-[52px]"
              >
                {mapaCheio ? <IconeRecolher className="size-5" /> : <IconeExpandir className="size-5" />}
              </button>
              {/* No celular a observação fica embaixo do mapa, no começo da lista. */}
              <p className="pointer-events-none absolute bottom-10 left-3 z-10 hidden rounded-full bg-raised/90 px-3 py-1 text-xs text-ink-muted lg:block">
                O ponto é a sede do órgão, não o local de entrega.
              </p>
              {erroMapa ? (
                <p role="alert" className="absolute left-16 top-3 z-10 max-w-[calc(100%-8rem)] rounded-[14px] bg-pin-soft px-3 py-2 text-xs text-pin-strong lg:left-20 lg:top-5">
                  {erroMapa}
                </p>
              ) : null}
            </section>
          )}
        </CartaoTopo>
        {oferta && !comTermo ? <FaixaOferta /> : null}
        <Suspense fallback={<Atalhos totais={{}} q={filtros.q} uf={filtros.uf} aoEscolher={escolherAtalho} />}>
          <AtalhosComTotais promessa={totaisAtalhos} q={filtros.q} uf={filtros.uf} aoEscolher={escolherAtalho} />
        </Suspense>
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
          <section aria-label="Lista de editais" id="lista-editais" ref={inicioLista} className="flex scroll-mt-3 flex-col">
            <ColunaLista
              resultado={resultado}
              agora={agora}
              vista={vista}
              filtros={filtros}
              carregandoLista={carregandoLista}
              erro={erroLista}
              erroExportar={erroExportar}
              ordem={ordemEfetiva(ordem, comTermo)}
              temTermo={comTermo}
              listaRef={listaRef}
              aoRolar={(topo) => {
                rolagem.current = topo;
              }}
              aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
              aoSelecionar={selecionar}
              aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
              aoMudarOrdem={mudarOrdem}
              carregandoMais={carregandoMais}
              erroMais={erroMais}
              aoCarregarMais={carregarMais}
              aoRecomecar={() => void carregarLista(filtros, { pagina: 1 })}
              aoAplicar={aplicar}
              confirmacao={buscaPronta ? textoDoResultado(buscaPronta.filtros, buscaPronta.total) : null}
              oferta={
                ofertaBuscada && buscaPronta ? (
                  <OfertaBusca key={ofertaBuscada.chave} oferta={ofertaBuscada} segmento={segmentoDaBusca(buscaPronta.filtros.q)} total={buscaPronta.total} />
                ) : null
              }
              // Celular: no meio dos editais, para nada de venda além da oferta ficar antes da lista.
              noMeio={
                assessoria ? (
                  <CartaoAssessoria
                    href={assessoria}
                    id="assessoria-inicio-celular"
                    titulo={TITULO_ASSESSORIA}
                    texto={TEXTO_ASSESSORIA}
                    botao={BOTAO_ASSESSORIA}
                    className="flex lg:hidden"
                  />
                ) : null
              }
            />
          </section>
          {/* A assessoria rola com a página; o valor e "Onde mais compram" continuam presos (os três juntos passam da altura da tela). */}
          <aside className="hidden flex-col gap-5 lg:flex lg:self-stretch">
            {assessoria ? (
              <CartaoAssessoria
                href={assessoria}
                id="assessoria-inicio"
                titulo={TITULO_ASSESSORIA}
                texto={TEXTO_ASSESSORIA}
                botao={BOTAO_ASSESSORIA}
                className="flex"
              />
            ) : null}
            <div className="flex flex-col gap-5 lg:sticky lg:top-4">
              <ValorEmJogo valor={valorTotal} total={painel.total} carregando={!pontosProntos} />
              <OndeMaisCompram municipios={painel.topMunicipios} carregando={!pontosProntos} termo={filtros.q} aoEscolher={escolherCidade} />
            </div>
          </aside>
        </div>
      </main>
      <FolhaFiltros
        aberta={folhaAberta}
        filtros={filtros}
        pontos={pontos}
        // Aplicar sem mudar nada só fecha (não refaz a busca).
        aoAplicar={(f) => {
          if (!mesmaBusca(f, filtros)) aplicar(f, { rolar: true });
        }}
        aoFechar={fecharFolha}
      />
      <BarraCelular ativo={ativoBarra} aoTrocarTela={aoBarra} />
    </div>
  );
}
