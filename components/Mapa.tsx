'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point } from 'geojson';
import type { GeoJSONSource, Map as MapaLibre, Marker } from 'maplibre-gl';
import { areaDoRaio, circulo, limitesDoCirculo, paraGeoJSON, type Raio } from '@/lib/geo';
import { CAMADA_ESPACO_PILULAS, CAMADA_NOMES_ESTADOS, carregarEstilo, linhasDica, pilula, type PropsPilula } from '@/lib/mapaRotulos';
import type { Cidade, PontoMapa } from '@/lib/tipos';
import { ALTURA_GAVETA_RECOLHIDA } from './GavetaCelular';

// Abre mostrando o Brasil inteiro.
const BRASIL: [[number, number], [number, number]] = [[-74.2, -33.9], [-34.6, 5.4]];
/** Altura da pílula acima do ponto: a dica abre logo acima dela. */
const ALTURA_PILULA = 34;

type Props = {
  pontos: PontoMapa[];
  /** Código IBGE da cidade do edital selecionado: a pílula dela (ou do grupo que a contém) fica azul-escura. */
  destaque: string | null;
  aoEscolherCidade: (c: Cidade) => void;
  /** Área do filtro de raio (centro na sede do município): círculo fino e enquadramento nela. */
  raio: Raio | null;
};

type ItemPilula = { marcador: Marker; botao: HTMLButtonElement; texto: HTMLSpanElement; props: PropsPilula };

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

export function Mapa({ pontos, destaque, aoEscolherCidade, raio }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const [pronto, setPronto] = useState(false);
  const pontosAtuais = useRef(pontos);
  const destaqueAtual = useRef(destaque);
  const escolher = useRef(aoEscolherCidade);
  const raioAtual = useRef(raio);

  useEffect(() => {
    escolher.current = aoEscolherCidade;
  }, [aoEscolherCidade]);

  // Pontos e cidade selecionada vão juntos para a fonte: o destaque precisa passar pelo agrupamento.
  useEffect(() => {
    pontosAtuais.current = pontos;
    destaqueAtual.current = destaque;
    if (pronto) (mapa.current?.getSource('editais') as GeoJSONSource | undefined)?.setData(paraGeoJSON(pontos, destaque));
  }, [pontos, destaque, pronto]);

  // Raio: círculo fino na área e o mapa enquadra nela. Depende só dos números: um objeto novo com os mesmos valores não reenquadra.
  useEffect(() => {
    raioAtual.current = raio;
    const m = mapa.current;
    if (!pronto || !m) return;
    (m.getSource('raio') as GeoJSONSource | undefined)?.setData(areaDoRaio(raio));
    if (!raio) return;
    // No celular a gaveta recolhida cobre a base do mapa (no máximo metade da altura, senão o fitBounds desiste).
    const celular = window.matchMedia('(max-width: 1023px)').matches;
    const baixo = celular ? Math.min(ALTURA_GAVETA_RECOLHIDA + 24, Math.floor(m.getContainer().clientHeight / 2)) : 40;
    m.fitBounds(limitesDoCirculo(circulo(raio.lng, raio.lat, raio.km)), { padding: { top: 40, right: 40, left: 40, bottom: baixo }, duration: 600 });
  }, [pronto, raio?.lng, raio?.lat, raio?.km]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      // maplibre-gl 6 é só ESM: sem export default.
      const maplibregl = await import('maplibre-gl');
      // O Turbopack reescreve import.meta.url do maplibre-gl e o worker padrão some (URL vazia):
      // aponta o worker para o arquivo do pacote, que o bundler publica como asset estático.
      maplibregl.setWorkerUrl(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
      // Fundo do OpenFreeMap ajustado, ou a reserva (fundo branco + nosso contorno) se ele não responder.
      const estilo = await carregarEstilo();
      if (cancelado || !caixa.current) return;
      // Os nomes dos estados e o espaço das pílulas precisam das fontes do OpenFreeMap: na reserva ficam de fora.
      const comFontes = Boolean(estilo.glyphs);
      // No celular a gaveta recolhida cobre a base do mapa: reserva esse espaço no enquadramento inicial,
      // mas no máximo metade da altura, senão em tela baixa o fitBounds desiste e o mapa fica em [0,0].
      const celular = window.matchMedia('(max-width: 1023px)').matches;
      const baixo = Math.min(ALTURA_GAVETA_RECOLHIDA + 16, Math.floor(caixa.current.clientHeight / 2));
      const m = new maplibregl.Map({
        container: caixa.current,
        style: estilo,
        bounds: BRASIL,
        fitBoundsOptions: { padding: celular ? { top: 16, right: 16, left: 16, bottom: baixo } : 16 },
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
        m.addSource('raio', { type: 'geojson', data: areaDoRaio(raioAtual.current) });
        m.addLayer({
          id: 'raio', type: 'line', source: 'raio',
          paint: { 'line-color': '#0c2340', 'line-width': 1.5, 'line-dasharray': [2, 2] },
        });
        m.addSource('editais', {
          type: 'geojson', data: paraGeoJSON(pontosAtuais.current, destaqueAtual.current),
          cluster: true, clusterRadius: 60, clusterMaxZoom: 8,
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
        botao.addEventListener('click', () => void aoClicar(chave));
        botao.addEventListener('mouseenter', () => {
          const atual = pilulas.get(chave);
          if (atual) dica.setLngLat(atual.marcador.getLngLat()).setDOMContent(conteudo(linhasDica(atual.props))).addTo(m);
        });
        botao.addEventListener('mouseleave', () => dica.remove());
        const marcador = new maplibregl.Marker({ element: botao, anchor: 'bottom' }).setLngLat(lngLat).addTo(m);
        return { marcador, botao, texto, props };
      };

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
          item.texto.textContent = p.texto;
          item.botao.setAttribute('aria-label', p.rotulo);
          // classList: o Marker põe as classes dele no mesmo elemento.
          item.botao.classList.toggle('pilula-mapa-destaque', p.destaque);
          item.botao.style.zIndex = p.destaque ? '2' : '1';
        }
        for (const [chave, item] of pilulas) {
          if (vistas.has(chave)) continue;
          item.marcador.remove();
          // Sem pílula, o mouseleave não vem: a dica ficaria presa.
          dica.remove();
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
