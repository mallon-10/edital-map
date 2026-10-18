'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { trocarEndereco } from '@/lib/cliente/endereco';
import { registrar } from '@/lib/cliente/registrar';
import { publicarUso } from '@/lib/cliente/uso';
import { guardarUltimaBusca, guardarVolta, tomarVolta, type Volta } from '@/lib/cliente/volta';
import type { Raio } from '@/lib/geo';
import { buscaDoCampo, filtrosAtivos, normalizarTela, ordemEfetiva, paraParametros, recursosUsados } from '@/lib/filtros';
import { PainelCnpj } from '@/components/cnpj/PainelCnpj';
import { consultarCnpj, type RespostaCnpj } from '@/lib/cliente/cnpj';
import { medir } from '@/lib/cliente/medir';
import { LimiteAtingido, lerLimite, lerRecursoPro, RecursoProBloqueado, type Limite, type RespostaBusca } from '@/lib/limites';
import { resumirPontos } from '@/lib/painel';
import { temTermo } from '@/lib/relevancia/termos';
import type { Cidade, EditalResumo, FiltrosTela, Ordem, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { mesmaBusca, telaPelaRolagem, urlDaBusca, type EstadoTela, type Tela, type Vista } from '@/lib/urlBusca';
import { BarraCelular } from './BarraCelular';
import { Mapa } from './Mapa';
import { AlternadorVista } from './inicio/AlternadorVista';
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
    // Raio ou órgão sem o Pro: a tela mostra o cartão do Pro.
    if (lerRecursoPro(resposta.status, corpo)) throw new RecursoProBloqueado();
    const erro = typeof corpo === 'object' && corpo !== null ? (corpo as { erro?: unknown }).erro : null;
    throw new Error(typeof erro === 'string' && erro.trim() ? erro : padrao);
  }
  if (corpo === null) throw new Error(padrao);
  return corpo as T;
}

const mensagem = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

type Props = {
  filtrosIniciais: FiltrosTela;
  /** Vista, parte do celular, página e ordem lidas do endereço. */
  estadoInicial: EstadoTela;
  /** null quando a busca do endereço já bateu no limite do dia. */
  inicial: ResultadoBusca | null;
  limiteInicial: Limite | null;
  /** A busca do endereço usa raio ou órgão sem o Pro. */
  proInicial?: boolean;
  agoraInicial: string;
  atualizadoEm: string | null;
};

/** Parte do estado guardada ao sair da página (o resto da Volta é calculado na hora de guardar). */
type Guardavel = Pick<Volta, 'filtros' | 'resultado' | 'limite' | 'tela' | 'selecionadoId'>;

export function Explorador({ filtrosIniciais, estadoInicial, inicial, limiteInicial, proInicial = false, agoraInicial, atualizadoEm }: Props) {
  const [filtros, setFiltros] = useState<FiltrosTela>(filtrosIniciais);
  // Celular: a parte da página pedida por último (botão da barra, cidade escolhida, aviso ou limite na lista), guardada
  // no endereço (`tela=lista` abre a página rolada até a lista). Só muda por ação explícita, nunca pela rolagem.
  const [tela, setTela] = useState<Tela>(estadoInicial.tela);
  // Lista ou Mapa (alternador no topo dos resultados), página e ordem da lista: vão no endereço e não contam como busca.
  const [vista, setVista] = useState<Vista>(estadoInicial.vista);
  const [pagina, setPagina] = useState(estadoInicial.pagina);
  const [ordem, setOrdem] = useState<Ordem | null>(estadoInicial.ordem);
  // Item aceso na barra de baixo: segue a rolagem. Fica fora do endereço: o replaceState do Next durante uma navegação
  // pendente (tocar num card e rolar um pouco) a descartaria.
  const [ativoBarra, setAtivoBarra] = useState<Tela>(estadoInicial.vista === 'lista' ? 'lista' : estadoInicial.tela);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial ?? SEM_RESULTADO);
  const [limite, setLimite] = useState<Limite | null>(limiteInicial);
  const [proBloqueado, setProBloqueado] = useState(proInicial);
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
  const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial?.editais[0]?.id ?? null);
  const [folhaAberta, setFolhaAberta] = useState(false);
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
  // O que vai no endereço além dos filtros (vista, tela, página, ordem), sempre o mais recente (callbacks antigos leem daqui).
  const estadoAtual = useRef<EstadoTela>(estadoInicial);
  /** Escreve a busca no endereço com o estado atual mais as mudanças (sem recarregar nem criar entrada no histórico). */
  const escreverEndereco = useCallback((f: FiltrosTela, mudancas: Partial<EstadoTela> = {}) => {
    estadoAtual.current = { ...estadoAtual.current, ...mudancas };
    trocarEndereco(urlDaBusca(f, estadoAtual.current));
  }, []);

  const painel = useMemo(() => resumirPontos(pontos), [pontos]);
  const selecionado = resultado.editais.find((e) => e.id === selecionadoId) ?? resultado.editais[0] ?? null;
  const comTermo = temTermo(filtros.q);
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
    /** 'ok', 'erro' (falha ou limite do dia) ou 'velho' (um pedido mais novo tomou o lugar: esta resposta não vale). */
    async (f: FiltrosTela, lista: { pagina?: number; ordem?: Ordem | null } = {}): Promise<'ok' | 'erro' | 'velho'> => {
      const id = ++pedidoLista.current;
      // Posições de uma volta do edital que ainda não foram aplicadas são da lista antiga: não valem para a nova.
      rolagemPendente.current = null;
      rolagemPaginaPendente.current = null;
      setCarregandoLista(true);
      try {
        // Mesma busca em outra página ou ordem: mesma chave no limite do dia (não conta de novo).
        const ordemPedida = lista.ordem === undefined ? estadoAtual.current.ordem : lista.ordem;
        const novo = await obter<RespostaBusca>(`/api/busca?${paraParametros(f, { pagina: lista.pagina ?? 1, ordem: ordemPedida })}`, ERRO_LISTA);
        if (id !== pedidoLista.current) return 'velho';
        setResultado({ total: novo.total, editais: novo.editais });
        if (f.q.trim()) medir('buscou', { chave: 'dia' });
        setLimite(null);
        setProBloqueado(false);
        if (novo.buscasUsadas !== null) publicarUso({ buscas: novo.buscasUsadas });
        setSelecionadoId(novo.editais[0]?.id ?? null);
        setAgora(new Date());
        setErroLista(null);
        return 'ok';
      } catch (e) {
        if (id !== pedidoLista.current) return 'velho';
        if (e instanceof RecursoProBloqueado) {
          setProBloqueado(true);
          setErroLista(null);
        } else if (e instanceof LimiteAtingido) {
          // Busca nova além do limite do dia: o cartão dos planos no lugar da lista (o mapa fica com a última permitida).
          setLimite(e.limite);
          publicarUso({ buscas: e.limite.usados });
          setErroLista(null);
        } else {
          setErroLista(mensagem(e, ERRO_LISTA));
        }
        // No celular o aviso e o cartão aparecem na lista, embaixo do mapa: a página rola até eles.
        if (ehCelular()) irPara('lista', f);
        return 'erro';
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
      if (e instanceof LimiteAtingido || e instanceof RecursoProBloqueado) {
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
  useEffect(() => guardarUltimaBusca(urlDaBusca(filtros, { pagina, ordem })), [filtros, pagina, ordem]);

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
    [carregarMapa, filtrosIniciais, estadoInicial, limiteInicial, proInicial],
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
      setLimite(volta.limite);
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
      // Mesmos parâmetros da busca que o servidor já contou (a lista veio pronta): o mapa não conta de novo.
      // Busca do endereço bloqueada pelo limite: o mapa do Brasil todo, que não conta.
      void carregarMapa(limiteInicial || proInicial ? VAZIO : filtrosIniciais);
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
  }, [carregarMapa, rolarPara, filtrosIniciais, estadoInicial, limiteInicial, proInicial]);

  /** Aplica filtros novos: a lista sempre; o mapa só quando muda o que ele recebe. Toda mudança conta como busca. */
  function aplicar(pedido: FiltrosTela, opcoes: { abrirLista?: boolean } = {}) {
    // Sem município não há raio (trocar a UF ou tirar a cidade tira o raio também).
    const novo = normalizarTela(pedido);
    // O mapa recebe tudo menos a cidade sozinha; com raio, recebe a cidade e o raio.
    const mudouMapa = paraParametros(novo, { comCidade: false }).toString() !== paraParametros(filtros, { comCidade: false }).toString();
    // Cidade nova (pelo mapa, pelo painel ou pela folha de Filtros): no celular a página rola até a lista dela.
    const cidadeNova = Boolean(novo.cidade && novo.cidade.ibge !== filtros.cidade?.ibge);
    setFiltros(novo);
    setAnimarFoco(true);
    // Filtro novo começa na página 1 (a ordem escolhida fica).
    setPagina(1);
    estadoAtual.current = { ...estadoAtual.current, pagina: 1 };
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

  /**
   * Lista | Mapa: troca a tela e escreve a vista no endereço (uma escrita). Não busca de novo nem conta: os pontos
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

  /** Barra do celular: Mapa leva à vista Mapa (no topo); Lista leva à vista Lista (no começo da lista). */
  function aoBarra(t: Tela) {
    if (t === 'mapa') {
      if (vista !== 'mapa') mudarVista('mapa');
      else irPara('mapa', filtros);
    } else if (vista !== 'lista') {
      mudarVista('lista');
    } else {
      setAtivoBarra('lista');
      rolarPara('lista');
    }
  }

  /**
   * Outra página da mesma busca: não conta como busca nem grava o evento "busca"; o mapa não muda.
   * O limite (402) e o uso do dia seguem o caminho de `carregarLista`.
   */
  async function irParaPagina(n: number) {
    if (n < 1 || n === pagina || carregandoLista) return;
    const antes = pagina;
    setPagina(n);
    escreverEndereco(filtros, { pagina: n });
    // Celular: a lista rola com a página; volta ao começo dela (a barra acende Lista).
    if (ehCelular()) {
      setAtivoBarra('lista');
      rolarPara('lista');
    }
    // Falhou: os cards continuam os da página anterior, então a paginação e o endereço voltam para ela
    // (e pedir a mesma página de novo funciona).
    if ((await carregarLista(filtros, { pagina: n })) === 'erro') {
      setPagina(antes);
      escreverEndereco(filtros, { pagina: antes });
    }
  }

  /** Outra ordem da mesma busca: volta à página 1; não conta como busca nem grava o evento "busca"; o mapa não muda. */
  async function mudarOrdem(o: Ordem) {
    const antes = { ordem, pagina };
    setOrdem(o);
    setPagina(1);
    escreverEndereco(filtros, { ordem: o, pagina: 1 });
    // Falhou: a lista na tela é a da ordem anterior; o seletor, a página e o endereço voltam para ela.
    if ((await carregarLista(filtros, { pagina: 1, ordem: o })) === 'erro') {
      setOrdem(antes.ordem);
      setPagina(antes.pagina);
      escreverEndereco(filtros, { ordem: antes.ordem, pagina: antes.pagina });
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
          aoCnpj={verCnpj}
          aoAbrirFiltros={() => setFolhaAberta(true)}
        />
        {cnpj ? (
          <div className="relative mt-3">
            {cnpj.estado === 'carregando' ? (
              <p role="status" className="rounded-md bg-sunken p-4 text-sm text-ink-muted">Consultando o CNPJ na Receita…</p>
            ) : cnpj.estado === 'erro' ? (
              <p role="alert" className="rounded-md bg-pin-soft p-4 pr-12 text-sm text-pin-strong">{cnpj.erro}</p>
            ) : (
              <PainelCnpj
                key={cnpj.r.empresa.razao}
                r={cnpj.r}
                aoVer={(q, uf) => {
                  setCnpj(null);
                  aplicar(buscaDoCampo(filtros, q, uf, { manterCidade: false }));
                }}
              />
            )}
            <button
              type="button"
              onClick={() => setCnpj(null)}
              aria-label="Fechar"
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-sm text-lg text-ink-muted hover:bg-raised"
            >
              ×
            </button>
          </div>
        ) : null}
        {/* Celular: os chips ficam na folha de Filtros. */}
        <div className="hidden lg:block">
          <Chips filtros={filtros} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={aplicar} />
        </div>
        {/* Lista | Mapa no topo dos resultados, nas duas larguras (vai no endereço e não conta como busca). */}
        <div className="mt-3 flex lg:mt-0 lg:justify-end">
          <AlternadorVista vista={vista} aoMudar={mudarVista} />
        </div>
      </div>
      {/* Celular: uma página que rola, com o mapa (altura fixa) em cima e a lista embaixo, no fluxo.
          Computador: três colunas (lista, mapa, resumo); a página rola inteira e o mapa e o resumo ficam presos na tela.
          Vista Lista: sem o mapa; no computador, a lista larga e o resumo à direita. */}
      <main
        className={`flex flex-col pt-3 lg:grid lg:items-start lg:gap-5 lg:px-6 lg:pb-6 lg:pt-4 ${
          naLista ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-[360px_minmax(0,1fr)_300px]'
        }`}
      >
        <h1 className="sr-only">{naLista ? 'Editais abertos' : 'Editais abertos no mapa'}</h1>
        <section
          aria-label="Lista de editais"
          id="lista-editais"
          ref={inicioLista}
          className="flex scroll-mt-3 flex-col px-4 pb-4 pt-4 lg:p-0"
        >
          <ColunaLista
            resultado={resultado}
            agora={agora}
            painel={painel}
            painelPronto={pontosProntos}
            vista={vista}
            filtros={filtros}
            selecionadoId={selecionado?.id ?? null}
            carregandoLista={carregandoLista}
            erro={erroLista}
            limite={limite}
            proBloqueado={proBloqueado}
            aoTirarFiltrosPro={() => aplicar({ ...filtros, orgao: null, raio: null })}
            pagina={pagina}
            ordem={ordemEfetiva(ordem, comTermo)}
            temTermo={comTermo}
            parametrosBusca={paraParametros(filtros, { ordem }).toString()}
            listaRef={listaRef}
            aoRolar={(topo) => {
              rolagem.current = topo;
            }}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
            aoSelecionar={selecionar}
            aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
            aoMudarOrdem={mudarOrdem}
            aoIrPagina={irParaPagina}
            aoAplicar={aplicar}
          />
        </section>
        {/* Vista Mapa. Celular: primeiro na página, com 58svh (pinça e um dedo mexem no mapa; fora dele, arrastar rola a página). */}
        {naLista ? null : (
          <section aria-label="Mapa" className="relative order-first h-[58svh] min-h-0 shrink-0 overflow-hidden bg-raised lg:sticky lg:top-4 lg:order-none lg:h-[calc(100dvh-2rem)] lg:rounded-lg lg:border lg:border-line">
            <Mapa pontos={pontos} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} sede={sedeMapa} animarFoco={animarFoco} />
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
        )}
        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)]">
          {!naLista && selecionado ? <CartaoSelecionado edital={selecionado} agora={agora} /> : null}
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
      <BarraCelular ativo={ativoBarra} aoTrocarTela={aoBarra} />
    </div>
  );
}
