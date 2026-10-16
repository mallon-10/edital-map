'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point } from 'geojson';
import type { ExpressionSpecification, GeoJSONSource, Map as MapaLibre, Marker } from 'maplibre-gl';
import { UFS_BRASIL } from '@/lib/eventos';
import { moedaCurta, numero } from '@/lib/formato';
import { paraGeoJSON, type PropsPonto } from '@/lib/geo';
import { contornosDosEstados, coresDosEstados } from '@/lib/painel';
import type { Cidade, PontoMapa } from '@/lib/tipos';
import { ALTURA_GAVETA_RECOLHIDA } from './GavetaCelular';

// Abre mostrando o Brasil inteiro.
const BRASIL: [[number, number], [number, number]] = [[-74.2, -33.9], [-34.6, 5.4]];
// Raio pela raiz do valor estimado (R$ 1 mi ≈ 8 px; R$ 100 mi ≈ 14 px; R$ 2,5 bi ≈ 26 px; R$ 10 bi ≈ 32 px).
const RAIO: ExpressionSpecification = ['interpolate', ['linear'], ['sqrt', ['get', 'valor']], 0, 5, 1000, 8, 10000, 14, 50000, 26, 100000, 32];
const PINO =
  '<svg viewBox="0 0 22 28" width="26" height="33" overflow="visible" aria-hidden="true"><path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f" stroke="#0c2340" stroke-width="1.5"/><circle cx="11" cy="11" r="3.5" fill="#f4f1e8"/></svg>';

type Props = {
  pontos: PontoMapa[];
  porUf: Record<string, number>;
  /** Código IBGE da cidade do edital selecionado: ganha o pino. */
  destaque: string | null;
  aoEscolherCidade: (c: Cidade) => void;
};

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

const editais = (n: number) => `${numero(n)} ${n === 1 ? 'edital aberto' : 'editais abertos'}`;

export function Mapa({ pontos, porUf, destaque, aoEscolherCidade }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const biblioteca = useRef<typeof import('maplibre-gl') | null>(null);
  const pino = useRef<Marker | null>(null);
  const [pronto, setPronto] = useState(false);
  const pontosAtuais = useRef(pontos);
  const porUfAtual = useRef(porUf);
  const escolher = useRef(aoEscolherCidade);

  useEffect(() => {
    escolher.current = aoEscolherCidade;
  }, [aoEscolherCidade]);

  useEffect(() => {
    pontosAtuais.current = pontos;
    if (pronto) (mapa.current?.getSource('editais') as GeoJSONSource | undefined)?.setData(paraGeoJSON(pontos));
  }, [pontos, pronto]);

  useEffect(() => {
    porUfAtual.current = porUf;
    if (!pronto || !mapa.current) return;
    const contorno = contornosDosEstados(porUf, UFS_BRASIL);
    mapa.current.setPaintProperty('estados', 'fill-color', coresDosEstados(porUf) as unknown as ExpressionSpecification);
    mapa.current.setPaintProperty('estados-contorno', 'line-color', contorno.cor as ExpressionSpecification | string);
    mapa.current.setPaintProperty('estados-contorno', 'line-width', contorno.largura as ExpressionSpecification | number);
  }, [porUf, pronto]);

  useEffect(() => {
    const m = mapa.current;
    const lib = biblioteca.current;
    if (!pronto || !m || !lib) return;
    const ponto = destaque ? pontos.find((p) => p.codigo_ibge === destaque) : undefined;
    if (!ponto) {
      pino.current?.remove();
      pino.current = null;
      return;
    }
    if (!pino.current) {
      const el = document.createElement('div');
      el.innerHTML = PINO; // SVG fixo, sem dado de usuário
      pino.current = new lib.Marker({ element: el, anchor: 'bottom' });
    }
    pino.current.setLngLat([ponto.lng, ponto.lat]).addTo(m);
  }, [pronto, destaque, pontos]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      // maplibre-gl 6 é só ESM: sem export default.
      const maplibregl = await import('maplibre-gl');
      if (cancelado || !caixa.current) return;
      biblioteca.current = maplibregl;
      // O Turbopack reescreve import.meta.url do maplibre-gl e o worker padrão some (URL vazia):
      // aponta o worker para o arquivo do pacote, que o bundler publica como asset estático.
      maplibregl.setWorkerUrl(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
      // No celular a gaveta recolhida cobre a base do mapa: reserva esse espaço no enquadramento inicial,
      // mas no máximo metade da altura, senão em tela baixa o fitBounds desiste e o mapa fica em [0,0].
      const celular = window.matchMedia('(max-width: 1023px)').matches;
      const baixo = Math.min(ALTURA_GAVETA_RECOLHIDA + 16, Math.floor(caixa.current.clientHeight / 2));
      const m = new maplibregl.Map({
        container: caixa.current,
        style: {
          version: 8,
          sources: {},
          layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#ffffff' } }],
        },
        bounds: BRASIL,
        fitBoundsOptions: { padding: celular ? { top: 16, right: 16, left: 16, bottom: baixo } : 16 },
        attributionControl: false,
        // Textos nativos do MapLibre em português do Brasil.
        locale: { 'Map.Title': 'Mapa de editais', 'NavigationControl.ZoomIn': 'Aproximar', 'NavigationControl.ZoomOut': 'Afastar' },
        // Sem bússola, o usuário não consegue voltar ao norte: nada de rotação nem inclinação.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      m.keyboard.disableRotation();
      mapa.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

      m.on('load', () => {
        m.addSource('estados', { type: 'geojson', data: '/geo/estados.json' });
        m.addLayer({
          id: 'estados', type: 'fill', source: 'estados',
          paint: { 'fill-color': coresDosEstados(porUfAtual.current) as unknown as ExpressionSpecification },
        });
        const contorno = contornosDosEstados(porUfAtual.current, UFS_BRASIL);
        m.addLayer({
          id: 'estados-contorno', type: 'line', source: 'estados',
          paint: { 'line-color': contorno.cor as ExpressionSpecification | string, 'line-width': contorno.largura as ExpressionSpecification | number },
        });
        m.addSource('editais', {
          type: 'geojson', data: paraGeoJSON(pontosAtuais.current),
          cluster: true, clusterRadius: 40, clusterMaxZoom: 8,
          clusterProperties: { qtd: ['+', ['get', 'qtd']], valor: ['+', ['get', 'valor']] },
        });
        m.addLayer({
          id: 'grupos', type: 'circle', source: 'editais', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#ff5a1f', 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-radius': RAIO },
        });
        m.addLayer({
          id: 'cidades', type: 'circle', source: 'editais', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#ff5a1f', 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-radius': RAIO },
        });
        setPronto(true);
      });

      // Dica estável: guarda o último texto e, se não mudou, só acompanha o cursor (sem refazer o DOM).
      let textoDica = '';
      const fecharDica = () => {
        popup.remove();
        textoDica = '';
      };

      // Um clique só, para o que estiver por cima: cidade e grupo podem se sobrepor.
      m.on('click', async (e) => {
        if (!m.getLayer('cidades')) return;
        const [f] = m.queryRenderedFeatures(e.point, { layers: ['cidades', 'grupos'] });
        if (!f) return;
        if (f.layer.id === 'grupos') {
          const zoom = await (m.getSource('editais') as GeoJSONSource).getClusterExpansionZoom(Number(f.properties?.cluster_id));
          m.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom });
          return;
        }
        const p = f.properties as PropsPonto;
        escolher.current({ ibge: String(p.ibge), nome: p.nome, uf: p.uf });
        // No toque não há mouseout: sem isso a dica ficaria na tela.
        fecharDica();
      });
      // Uma dica só, para o que estiver por cima: cidade, grupo ou estado.
      m.on('mousemove', (e) => {
        // Antes do 'load' as camadas ainda não existem.
        if (!m.getLayer('cidades')) return;
        const [f] = m.queryRenderedFeatures(e.point, { layers: ['cidades', 'grupos', 'estados'] });
        if (!f) {
          fecharDica();
          m.getCanvas().style.cursor = '';
          return;
        }
        const p = (f.properties ?? {}) as Record<string, unknown>;
        const valor = moedaCurta(Number(p.valor ?? 0));
        let linhas: string[];
        if (f.layer.id === 'cidades') linhas = [`${p.nome}/${p.uf}`, editais(Number(p.qtd)), ...(valor ? [valor] : [])];
        else if (f.layer.id === 'grupos') linhas = [editais(Number(p.qtd)), ...(valor ? [valor] : []), 'Aproxime para ver as cidades'];
        else {
          const uf = String(p.uf);
          linhas = [uf, editais(porUfAtual.current[uf] ?? 0)];
        }
        m.getCanvas().style.cursor = f.layer.id === 'estados' ? '' : 'pointer';
        const texto = linhas.join('|');
        if (texto === textoDica) {
          popup.setLngLat(e.lngLat);
          return;
        }
        textoDica = texto;
        popup.setLngLat(e.lngLat).setDOMContent(conteudo(linhas)).addTo(m);
      });
      m.on('mouseout', fecharDica);
    })();
    return () => {
      cancelado = true;
      pino.current?.remove();
      pino.current = null;
      setPronto(false);
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
