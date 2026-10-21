'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point } from 'geojson';
import type { GeoJSONSource, Map as MapaLibre, Marker } from 'maplibre-gl';
import { areaDoRaio, BRASIL, focoDoMapa, paraGeoJSON, ZOOM_SEM_GRUPOS, type Raio } from '@/lib/geo';
import { CAMADA_ESPACO_PILULAS, CAMADA_NOMES_ESTADOS, carregarEstilo, linhasDica, pilula, type PropsPilula } from '@/lib/mapaRotulos';
import type { Cidade, PontoMapa } from '@/lib/tipos';
import { ALTURA_GAVETA_RECOLHIDA } from './GavetaCelular';

/** Altura da pílula acima do ponto: a dica abre logo acima dela. */
const ALTURA_PILULA = 34;

type Props = {
  pontos: PontoMapa[];
  /** Código IBGE da cidade do edital selecionado: a pílula dela (ou do grupo que a contém) fica azul-escura. */
  destaque: string | null;
  aoEscolherCidade: (c: Cidade) => void;
  /** Área do filtro de raio (centro na sede do município): círculo fino e enquadramento nela. */
  raio: Raio | null;
  /** Sede ([lng, lat]) do município filtrado: sem raio, o mapa vai até a cidade; sem os dois, volta ao Brasil. */
  sede: [number, number] | null;
  /** Falso até o usuário mudar um filtro: o foco da abertura (link direto, volta do edital) vai direto, sem voo desde o Brasil. */
  animarFoco: boolean;
};

type ItemPilula = { marcador: Marker; botao: HTMLButtonElement; texto: HTMLSpanElement; props: PropsPilula };

/**
 * Folga do Brasil inteiro. No celular a gaveta recolhida cobre a base do mapa: reserva esse espaço,
 * mas no máximo metade da altura, senão em tela baixa o fitBounds desiste e o mapa fica em [0,0].
 */
function folgaBrasil(celular: boolean, altura: number) {
  return celular ? { top: 16, right: 16, left: 16, bottom: Math.min(ALTURA_GAVETA_RECOLHIDA + 16, Math.floor(altura / 2)) } : 16;
}

/** Folga do raio e do município: a mesma regra da gaveta, com mais margem. */
function folgaFoco(celular: boolean, altura: number) {
  const baixo = celular ? Math.min(ALTURA_GAVETA_RECOLHIDA + 24, Math.floor(altura / 2)) : 40;
  return { top: 40, right: 40, left: 40, bottom: baixo };
}

function conteudo(linhas: string[]): HTMLElement {
  const div = document.createElement('div');
  linhas.forEach((texto, i) => {
    const linha = document.createElement('div');
    if (i === 0) linha.style.fontWeight = '700';
    linha.textContent = texto;
    div.append(linha);
  });
  return div;
}

export function Mapa({ pontos, destaque, aoEscolherCidade, raio, sede, animarFoco }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const [pronto, setPronto] = useState(false);
  const pontosAtuais = useRef(pontos);
  const destaqueAtual = useRef(destaque);
  const escolher = useRef(aoEscolherCidade);
  const raioAtual = useRef(raio);
  // Falso enquanto o mapa mostra o Brasil da abertura: sem foco, só volta ao Brasil quem saiu dele.
  const focado = useRef(false);
  const animarAtual = useRef(animarFoco);

  useEffect(() => {
    escolher.current = aoEscolherCidade;
  }, [aoEscolherCidade]);

  // Lido pelo efeito do foco (declarado depois, roda depois no mesmo commit) sem virar dependência dele.
  useEffect(() => {
    animarAtual.current = animarFoco;
  }, [animarFoco]);

  // Pontos e cidade selecionada vão juntos para a fonte: o destaque precisa passar pelo agrupamento.
  useEffect(() => {
    pontosAtuais.current = pontos;
    destaqueAtual.current = destaque;
    if (pronto) (mapa.current?.getSource('editais') as GeoJSONSource | undefined)?.setData(paraGeoJSON(pontos, destaque));
  }, [pontos, destaque, pronto]);

  // Foco do mapa num efeito só (raio e município não podem brigar): círculo fino do raio e o enquadramento —
  // o raio vence; sem ele, a cidade e os vizinhos; sem os dois, de volta ao Brasil.
  // Depende só dos números: pontos novos, prazo ou um objeto novo com os mesmos valores não reenquadram.
  useEffect(() => {
    raioAtual.current = raio;
    const m = mapa.current;
    if (!pronto || !m) return;
    (m.getSource('raio') as GeoJSONSource | undefined)?.setData(areaDoRaio(raio));
    const celular = window.matchMedia('(max-width: 1023px)').matches;
    const altura = m.getContainer().clientHeight;
    const padding = folgaFoco(celular, altura);
    const d = focoDoMapa(
      { raio, sede, focado: focado.current, animar: animarAtual.current },
      (limites) => m.cameraForBounds(limites, { padding })?.zoom ?? null,
    );
    focado.current = d.tipo === 'enquadrar' || d.tipo === 'voar';
    if (d.tipo === 'brasil') m.fitBounds(d.limites, { padding: folgaBrasil(celular, altura), duration: d.duracao });
    else if (d.tipo === 'enquadrar') m.fitBounds(d.limites, { padding, duration: d.duracao });
    else if (d.tipo === 'voar') m.flyTo({ center: d.centro, zoom: d.zoom, duration: d.duracao });
  }, [pronto, raio?.lng, raio?.lat, raio?.km, sede?.[0], sede?.[1]]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      // maplibre-gl 6 é só ESM: sem export default.
      // Biblioteca e estilo em paralelo.
      const [maplibregl, estilo] = await Promise.all([import('maplibre-gl'), carregarEstilo()]);
      // O Turbopack reescreve import.meta.url do maplibre-gl e o worker padrão some (URL vazia):
      // aponta o worker para o arquivo do pacote, que o bundler publica como asset estático.
      maplibregl.setWorkerUrl(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
      // `estilo`: fundo do OpenFreeMap ajustado, ou a reserva (fundo branco + nosso contorno) se ele não responder.
      if (cancelado || !caixa.current) return;
      // Os nomes dos estados e o espaço das pílulas precisam das fontes do OpenFreeMap: na reserva ficam de fora.
      const comFontes = Boolean(estilo.glyphs);
      const celular = window.matchMedia('(max-width: 1023px)').matches;
      // Abre no Brasil inteiro; o efeito do foco leva à cidade ou ao raio quando o mapa fica pronto.
      focado.current = false;
      const m = new maplibregl.Map({
        container: caixa.current,
        style: estilo,
        bounds: BRASIL,
        fitBoundsOptions: { padding: folgaBrasil(celular, caixa.current.clientHeight) },
        // Crédito do OpenStreetMap é obrigatório com o fundo; na reserva não há fonte de terceiros.
        attributionControl: comFontes ? { compact: true } : false,
        // Textos nativos do MapLibre em português do Brasil.
        locale: {
          'Map.Title': 'Mapa de editais',
          'NavigationControl.ZoomIn': 'Aproximar',
          'NavigationControl.ZoomOut': 'Afastar',
          'AttributionControl.ToggleAttribution': 'Mostrar créditos do mapa',
        },
        // Sem bússola, o usuário não consegue voltar ao norte: nada de rotação nem inclinação.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      m.keyboard.disableRotation();
      mapa.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const dica = new maplibregl.Popup({ closeButton: false, closeOnClick: false, anchor: 'bottom', offset: ALTURA_PILULA });

      m.on('load', () => {
        // Créditos compactos começam recolhidos (o MapLibre os abre no carregamento; no celular cobriam o mapa). O "i" abre.
        caixa.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
        m.addSource('raio', { type: 'geojson', data: areaDoRaio(raioAtual.current) });
        m.addLayer({
          id: 'raio', type: 'line', source: 'raio',
          paint: { 'line-color': '#0c2340', 'line-width': 1.5, 'line-dasharray': [2, 2] },
        });
        m.addSource('editais', {
          type: 'geojson', data: paraGeoJSON(pontosAtuais.current, destaqueAtual.current),
          cluster: true, clusterRadius: 60, clusterMaxZoom: ZOOM_SEM_GRUPOS - 1,
          clusterProperties: { qtd: ['+', ['get', 'qtd']], valor: ['+', ['get', 'valor']], destaque: ['max', ['get', 'destaque']] },
        });
        // Sem camada que leia a fonte o MapLibre não monta os tiles e querySourceFeatures volta vazio (caso da reserva).
        m.addLayer({ id: 'editais-base', type: 'circle', source: 'editais', paint: { 'circle-radius': 0, 'circle-opacity': 0 } });
        if (comFontes) {
          m.addSource('nomes-estados', { type: 'geojson', data: '/geo/estados-rotulos.json' });
          m.addLayer(CAMADA_NOMES_ESTADOS);
          // Por cima dos nomes: o MapLibre posiciona de cima para baixo, então o espaço das pílulas vem primeiro.
          m.addLayer(CAMADA_ESPACO_PILULAS);
        }
        setPronto(true);
      });

      // Pílulas: um botão por grupo ou cidade visível, reaproveitado enquanto continuar na tela.
      const pilulas = new Map<string, ItemPilula>();
      // Chave da pílula sob o mouse: só a remoção dela fecha a dica.
      let sobMouse: string | null = null;
      // Arrastar o mapa começando numa pílula termina no mesmo botão e o navegador dispara `click`: não pode virar ação.
      let arrastou = false;
      let apertou: { x: number; y: number } | null = null;
      m.on('dragstart', () => { arrastou = true; });

      const aoClicar = async (chave: string) => {
        const item = pilulas.get(chave);
        if (!item) return;
        dica.remove();
        const p = item.props;
        if (p.cluster === true) {
          try {
            const zoom = await (m.getSource('editais') as GeoJSONSource).getClusterExpansionZoom(Number(p.cluster_id));
            m.easeTo({ center: item.marcador.getLngLat(), zoom });
          } catch {
            // Grupo que sumiu entre o clique e a resposta: nada a fazer.
          }
          return;
        }
        escolher.current({ ibge: String(p.ibge), nome: String(p.nome), uf: String(p.uf) });
      };

      const criar = (chave: string, lngLat: [number, number], props: PropsPilula): ItemPilula => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.classList.add('pilula-mapa');
        const texto = document.createElement('span');
        botao.append(texto);
        botao.addEventListener('pointerdown', (e) => {
          apertou = { x: e.clientX, y: e.clientY };
          arrastou = false;
        });
        // Soltou o mouse longe do botão (sem click) e depois usou o teclado: o toque antigo não vale.
        botao.addEventListener('keydown', () => { apertou = null; });
        botao.addEventListener('click', (e) => {
          // Enter no teclado dispara `click` sem pointerdown: vale.
          const antes = apertou;
          apertou = null;
          if (antes && (arrastou || Math.hypot(e.clientX - antes.x, e.clientY - antes.y) >= 3)) return;
          void aoClicar(chave);
        });
        botao.addEventListener('mouseenter', () => {
          sobMouse = chave;
          const atual = pilulas.get(chave);
          if (atual) dica.setLngLat(atual.marcador.getLngLat()).setDOMContent(conteudo(linhasDica(atual.props))).addTo(m);
        });
        botao.addEventListener('mouseleave', () => {
          if (sobMouse === chave) sobMouse = null;
          dica.remove();
        });
        const marcador = new maplibregl.Marker({ element: botao, anchor: 'bottom' }).setLngLat(lngLat).addTo(m);
        return { marcador, botao, texto, props };
      };

      const caixaMapa = m.getContainer();
      const atualizarPilulas = () => {
        const vistas = new Set<string>();
        for (const f of m.querySourceFeatures('editais')) {
          const props = f.properties as PropsPilula;
          const p = pilula(props);
          // A mesma cidade ou grupo aparece em mais de um tile.
          if (vistas.has(p.chave)) continue;
          vistas.add(p.chave);
          const coords = (f.geometry as Point).coordinates as [number, number];
          const item = pilulas.get(p.chave) ?? criar(p.chave, coords, props);
          pilulas.set(p.chave, item);
          // O cluster_id é reaproveitado depois de setData: a mesma chave pode apontar para outro lugar.
          const atual = item.marcador.getLngLat();
          if (atual.lng !== coords[0] || atual.lat !== coords[1]) item.marcador.setLngLat(coords);
          item.props = props;
          // Só escreve no DOM o que mudou: isto roda a cada quadro.
          if (item.texto.textContent !== p.texto) item.texto.textContent = p.texto;
          if (item.botao.getAttribute('aria-label') !== p.rotulo) item.botao.setAttribute('aria-label', p.rotulo);
          // classList: o Marker põe as classes dele no mesmo elemento.
          if (item.botao.classList.contains('pilula-mapa-destaque') !== p.destaque) item.botao.classList.toggle('pilula-mapa-destaque', p.destaque);
          const z = p.destaque ? '2' : '1';
          if (item.botao.style.zIndex !== z) item.botao.style.zIndex = z;
          // querySourceFeatures devolve tiles inteiros: pílula fora da vista não pode receber foco (o Tab rolaria o mapa).
          const ponto = m.project(coords);
          const dentro = ponto.x >= 0 && ponto.y >= 0 && ponto.x <= caixaMapa.clientWidth && ponto.y <= caixaMapa.clientHeight;
          const tab = dentro ? 0 : -1;
          if (item.botao.tabIndex !== tab) item.botao.tabIndex = tab;
        }
        for (const [chave, item] of pilulas) {
          if (vistas.has(chave)) continue;
          item.marcador.remove();
          // Sem pílula, o mouseleave não vem: a dica ficaria presa (só se era a pílula sob o mouse).
          if (sobMouse === chave) {
            sobMouse = null;
            dica.remove();
          }
          pilulas.delete(chave);
        }
      };

      m.on('render', () => {
        if (m.getSource('editais') && m.isSourceLoaded('editais')) atualizarPilulas();
      });
    })();
    return () => {
      cancelado = true;
      setPronto(false);
      // remove() também tira as pílulas (Markers) e a dica.
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  // O MapLibre põe `position: relative` (CSS sem camada) no contêiner do mapa e vencia o `absolute` do Tailwind:
  // o mapa fica num filho que só preenche o pai.
  return (
    <div className="absolute inset-0" role="region" aria-label="Mapa de editais abertos por município">
      <div ref={caixa} className="h-full w-full" />
    </div>
  );
}
