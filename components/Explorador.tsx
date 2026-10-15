'use client';

import { useCallback, useEffect, useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import type { Cidade, PontoMapa, ResultadoBusca } from '@/lib/tipos';
import { Busca, type ValoresBusca } from './Busca';
import { GavetaCelular } from './GavetaCelular';
import { Lista } from './Lista';
import { Mapa } from './Mapa';

const VAZIO: ValoresBusca = { q: '', uf: '', seteDias: false };

function parametros(v: ValoresBusca, cidade: Cidade | null, deslocamento = 0): URLSearchParams {
  const p = new URLSearchParams();
  if (v.q.trim()) p.set('q', v.q.trim());
  if (v.uf) p.set('uf', v.uf);
  if (v.seteDias) p.set('dias', '7');
  if (cidade) p.set('ibge', cidade.ibge);
  if (deslocamento) p.set('deslocamento', String(deslocamento));
  return p;
}

async function obter<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const j = (await r.json()) as T & { erro?: string };
  if (!r.ok) throw new Error(j.erro ?? `HTTP ${r.status}`);
  return j;
}

export function Explorador({ inicial, agoraInicial }: { inicial: ResultadoBusca; agoraInicial: string }) {
  const [valores, setValores] = useState<ValoresBusca>(VAZIO);
  const [cidade, setCidade] = useState<Cidade | null>(null);
  const [resultado, setResultado] = useState<ResultadoBusca>(inicial);
  const [agora, setAgora] = useState(() => new Date(agoraInicial));
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoMapa[]>([]);

  const carregarLista = useCallback(async (v: ValoresBusca, c: Cidade | null) => {
    setCarregando(true);
    setErro(null);
    try {
      setResultado(await obter<ResultadoBusca>(`/api/busca?${parametros(v, c)}`));
      setAgora(new Date());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível buscar agora.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarMapa = useCallback(async (v: ValoresBusca) => {
    try {
      setPontos(await obter<PontoMapa[]>(`/api/mapa?${parametros(v, null)}`));
    } catch {
      setErro('Não foi possível carregar o mapa agora.');
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
      void carregarLista(valores, c);
    },
    [carregarLista, valores],
  );

  function tirarCidade() {
    setCidade(null);
    void carregarLista(valores, null);
  }

  async function carregarMais() {
    setCarregando(true);
    try {
      const mais = await obter<ResultadoBusca>(`/api/busca?${parametros(valores, cidade, resultado.editais.length)}`);
      setResultado({ total: resultado.total, editais: [...resultado.editais, ...mais.editais] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar mais.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <div className="px-4 pt-4 md:px-6">
        <Busca inicial={VAZIO} aoBuscar={buscar} />
      </div>
      <main className="md:grid md:grid-cols-[minmax(0,1fr)_440px] md:gap-6 md:px-6 md:py-4">
        <section
          aria-label="Mapa"
          className="relative mt-4 h-[calc(100dvh-230px)] overflow-hidden bg-sunken md:mt-0 md:h-[72vh] md:min-h-[420px] md:rounded-lg"
        >
          <Mapa pontos={pontos} aoEscolherCidade={escolherCidade} />
          <div className="absolute bottom-3 left-3 hidden max-w-[300px] rounded-md border border-line bg-raised px-3 py-2 text-xs leading-[18px] text-ink-muted md:block">
            <p><span className="mr-1.5 inline-block size-2.5 rounded-full bg-ink align-[-1px]" aria-hidden="true" />Grupo de municípios · número = editais abertos</p>
            <p><span className="mr-1.5 inline-block size-2.5 rounded-full bg-pin align-[-1px]" aria-hidden="true" />Município · clique para ver os editais</p>
            <p>O ponto é a sede do órgão, não o local de entrega.</p>
          </div>
        </section>
        <GavetaCelular>
          <Lista
            resultado={resultado}
            agora={agora}
            cidade={cidade}
            carregando={carregando}
            erro={erro}
            aoTirarCidade={tirarCidade}
            aoCarregarMais={carregarMais}
          />
        </GavetaCelular>
      </main>
    </>
  );
}
