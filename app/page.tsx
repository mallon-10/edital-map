import type { Metadata } from 'next';
import { Suspense } from 'react';
import { preload } from 'react-dom';
import { URL_MAPA_BRASIL } from '@/lib/pontosMapa';
import { connection } from 'next/server';
import { AtalhoRadar } from '@/components/AtalhoRadar';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { Medir } from '@/components/Medir';
import { SobreInicio } from '@/components/inicio/SobreInicio';
import { lerFiltros, paraParametros } from '@/lib/filtros';
import { mostrarOferta } from '@/lib/planos';
import { jsonLdMarca } from '@/lib/seo/marca';
import { temBusca } from '@/lib/seo/textos';
import { atualizadoEm, buscarEditais, pontosDoMapa } from '@/lib/servidor/consultas';
import { cidadesComPagina, totaisDosAtalhos } from '@/lib/servidor/licitacoes';
import { municipioPorIbge, orgaoPorCnpj } from '@/lib/servidor/nomes';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { planoDaPagina } from '@/lib/servidor/plano';
import { lerBuscaDaUrl, montarTela, paraUrlSearchParams, urlDaBusca } from '@/lib/urlBusca';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Links de assunto, estado e cidade embaixo da lista: as cidades (cache de 1 h) chegam depois, sem segurar a página. */
async function SobreInicioComCidades() {
  return <SobreInicio cidades={await cidadesComPagina()} />;
}

/** Página inicial limpa indexa; com busca no endereço, fica fora do índice (busca infinita) e aponta para /. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const busca = temBusca(await searchParams);
  return {
    alternates: { canonical: '/' },
    robots: busca ? { index: false, follow: true } : undefined,
  };
}

/** Página inicial. A busca vem do endereço (/?q=luva&uf=SC&…), sem limite (grátis e sem conta). */
export default async function Inicio({ searchParams }: Props) {
  await connection();
  const { busca, estado } = lerBuscaDaUrl(paraUrlSearchParams(await searchParams));
  const cnpj = busca.orgao;
  // Nomes para os chips; se a consulta falhar, o filtro só sai da tela.
  const [cidade, orgao] = await Promise.all([
    busca.ibge ? municipioPorIbge(busca.ibge).catch(() => null) : Promise.resolve(null),
    cnpj ? orgaoPorCnpj(cnpj).catch(() => null) : Promise.resolve(null),
  ]);
  const filtros = montarTela(busca, cidade, orgao);
  // A mesma busca que a lista pede a /api/busca: o navegador não repete o pedido da lista ao abrir (recebe `inicial`).
  const daLista = lerFiltros(paraParametros(filtros, { pagina: estado.pagina, ordem: estado.ordem }));
  const ctx = await contextoDaPagina();
  // Sem esperar: a contagem dos atalhos e os pontos do mapa da busca vão ao navegador como promessas e chegam na mesma
  // resposta, depois do HTML (a página não fica parada esperando por eles).
  const totaisAtalhos = totaisDosAtalhos();
  const comFiltros = Boolean(paraParametros(filtros).toString());
  const pontosIniciais = comFiltros ? pontosDoMapa(lerFiltros(paraParametros(filtros))).catch(() => null) : null;
  const [inicial, atualizado, plano] = await Promise.all([buscarEditais(daLista), atualizadoEm(), planoDaPagina(ctx)]);
  // Página sem busca: o navegador começa a baixar os pontos do mapa junto com o HTML (vêm da CDN, URL_MAPA_BRASIL).
  if (!comFiltros) preload(URL_MAPA_BRASIL, { as: 'fetch', crossOrigin: 'anonymous' });
  const agora = new Date().toISOString();
  // A página rola nas duas larguras: busca, cartão do topo (resumo e mapa), oferta, assuntos e lista (no celular a barra
  // de baixo reserva o espaço dela no body). A oferta do Pro fica embaixo do cartão do topo, não embaixo do cabeçalho.
  // A chave muda a cada desenho do servidor: o logo ou "Mapa" (href="/") com uma busca na tela recomeça o Explorador
  // (com a mesma chave o React manteria o estado da busca anterior sob o endereço novo). Mesmo endereço: a volta restaura.
  return (
    <div className="flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMarca()).replace(/</g, '\\u003c') }} />
      <Cabecalho plano={plano} semOferta />
      {busca.q?.trim() ? <Medir conversao="buscou" chave="dia" /> : null}
      <AtalhoRadar />
      <Explorador
        key={`${urlDaBusca(filtros, estado)}@${agora}`}
        filtrosIniciais={filtros}
        estadoInicial={estado}
        inicial={inicial}
        agoraInicial={agora}
        atualizadoEm={atualizado}
        oferta={mostrarOferta(plano, '/')}
        totaisAtalhos={totaisAtalhos}
        pontosIniciais={pontosIniciais}
      />
      <Suspense fallback={null}>
        <SobreInicioComCidades />
      </Suspense>
    </div>
  );
}
