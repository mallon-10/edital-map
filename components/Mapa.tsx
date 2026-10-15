'use client';

import { useEffect, useRef } from 'react';
import type { Point } from 'geojson';
import type { GeoJSONSource, Map as MapaLibre } from 'maplibre-gl';
import { moeda, numero } from '@/lib/formato';
import { paraGeoJSON, type PropsPonto } from '@/lib/geo';
import type { Cidade, PontoMapa } from '@/lib/tipos';

// Começa enquadrando o Sul (cobertura atual); o usuário pode afastar para ver o Brasil.
const LIMITES_INICIAIS: [[number, number], [number, number]] = [[-58.2, -33.8], [-47.8, -22.4]];

type Props = { pontos: PontoMapa[]; aoEscolherCidade: (c: Cidade) => void };

export function Mapa({ pontos, aoEscolherCidade }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const carregado = useRef(false);
  const pontosAtuais = useRef(pontos);
  const escolher = useRef(aoEscolherCidade);

  useEffect(() => {
    escolher.current = aoEscolherCidade;
  }, [aoEscolherCidade]);

  useEffect(() => {
    pontosAtuais.current = pontos;
    if (carregado.current) (mapa.current?.getSource('editais') as GeoJSONSource | undefined)?.setData(paraGeoJSON(pontos));
  }, [pontos]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      // maplibre-gl 6 é só ESM: sem export default.
      const maplibregl = await import('maplibre-gl');
      if (cancelado || !caixa.current) return;
      // O Turbopack reescreve import.meta.url do maplibre-gl e o worker padrão some (URL vazia):
      // aponta o worker para o arquivo do pacote, que o bundler publica como asset estático.
      maplibregl.setWorkerUrl(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
      // No celular a gaveta da lista cobre a parte de baixo (38% da janela): reserva esse espaço no enquadramento inicial.
      const celular = window.matchMedia('(max-width: 767px)').matches;
      const m = new maplibregl.Map({
        container: caixa.current,
        style: {
          version: 8,
          glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
          sources: {},
          layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#ebe6d9' } }],
        },
        bounds: LIMITES_INICIAIS,
        fitBoundsOptions: {
          padding: celular ? { top: 24, right: 24, left: 24, bottom: Math.round(window.innerHeight * 0.38) + 24 } : 24,
        },
        attributionControl: false,
        // Textos nativos do MapLibre em português do Brasil.
        locale: { 'Map.Title': 'Mapa de editais', 'NavigationControl.ZoomIn': 'Aproximar', 'NavigationControl.ZoomOut': 'Afastar' },
        // Sem bússola, o usuário não consegue voltar ao norte: nada de rotação nem inclinação.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      mapa.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

      m.on('load', () => {
        m.addSource('municipios', { type: 'geojson', data: '/geo/municipios.json' });
        m.addLayer({
          id: 'municipios', type: 'circle', source: 'municipios',
          paint: { 'circle-color': '#b9b3a3', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.1, 7, 2.2, 10, 3] },
        });
        m.addSource('editais', {
          type: 'geojson', data: paraGeoJSON(pontosAtuais.current),
          cluster: true, clusterRadius: 48, clusterMaxZoom: 8,
          clusterProperties: { qtd: ['+', ['get', 'qtd']] },
        });
        m.addLayer({
          id: 'grupos', type: 'circle', source: 'editais', filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#0c2340', 'circle-stroke-color': '#f4f1e8', 'circle-stroke-width': 2,
            'circle-radius': ['step', ['get', 'qtd'], 14, 50, 18, 200, 23, 1000, 30],
          },
        });
        m.addLayer({
          id: 'grupos-numero', type: 'symbol', source: 'editais', filter: ['has', 'point_count'],
          layout: {
            'text-field': ['number-format', ['get', 'qtd'], { locale: 'pt-BR' }],
            'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true,
          },
          paint: { 'text-color': '#f4f1e8' },
        });
        m.addLayer({
          id: 'cidades', type: 'circle', source: 'editais', filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#ff5a1f', 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5,
            'circle-radius': ['interpolate', ['linear'], ['get', 'qtd'], 1, 5, 10, 8, 50, 13, 200, 20],
          },
        });
        carregado.current = true;
      });

      m.on('click', 'grupos', async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const zoom = await (m.getSource('editais') as GeoJSONSource).getClusterExpansionZoom(Number(f.properties?.cluster_id));
        m.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom });
      });
      m.on('click', 'cidades', (e) => {
        const p = e.features?.[0]?.properties as PropsPonto | undefined;
        if (p) escolher.current({ ibge: p.ibge, nome: p.nome, uf: p.uf });
      });
      m.on('mouseenter', 'cidades', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as PropsPonto;
        const div = document.createElement('div');
        const titulo = document.createElement('b');
        titulo.textContent = `${p.nome}/${p.uf}`;
        const linha = document.createElement('div');
        linha.textContent = `${numero(Number(p.qtd))} ${Number(p.qtd) === 1 ? 'edital aberto' : 'editais abertos'}`;
        div.append(titulo, linha);
        const valor = moeda(p.valor);
        if (valor) {
          const v = document.createElement('div');
          v.className = 'font-mono';
          v.textContent = valor;
          div.append(v);
        }
        popup.setLngLat((f.geometry as Point).coordinates as [number, number]).setDOMContent(div).addTo(m);
      });
      m.on('mouseleave', 'cidades', () => {
        m.getCanvas().style.cursor = '';
        popup.remove();
      });
      m.on('mouseenter', 'grupos', () => {
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'grupos', () => {
        m.getCanvas().style.cursor = '';
      });
    })();
    return () => {
      cancelado = true;
      carregado.current = false;
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
