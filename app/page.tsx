import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { URL_MAPA_BRASIL } from '@/lib/pontosMapa';
import { connection } from 'next/server';
import { AtalhoRadar } from '@/components/AtalhoRadar';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { Medir } from '@/components/Medir';
import { SobreInicio } from '@/components/inicio/SobreInicio';
import { lerFiltros, paraParametros } from '@/lib/filtros';
import { precisaPro } from '@/lib/limites';
import { jsonLdMarca } from '@/lib/seo/marca';
import { temBusca } from '@/lib/seo/textos';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';
import { cidadesComPagina } from '@/lib/servidor/licitacoes';
import { municipioPorIbge, orgaoPorCnpj } from '@/lib/servidor/nomes';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { decidirBusca, semRecursoPro, usoDoDia } from '@/lib/servidor/uso';
import { lerBuscaDaUrl, montarTela, paraUrlSearchParams, urlDaBusca } from '@/lib/urlBusca';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Página inicial limpa indexa; com busca no endereço, fica fora do índice (busca infinita) e aponta para /. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const busca = temBusca(await searchParams);
  return {
    alternates: { canonical: '/' },
    robots: busca ? { index: false, follow: true } : undefined,
  };
}

/** Página inicial. A busca vem do endereço (/?q=luva&uf=SC&…) e conta no limite do dia como a de /api/busca. */
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
  // A mesma busca que a lista pede a /api/busca (mesma chave no limite do dia). O navegador não repete o pedido da lista
  // ao abrir (recebe `inicial`) e o mapa leva os mesmos parâmetros: a busca do endereço conta uma vez só.
  // Página e ordem vêm do endereço e não mudam a chave do limite (a mesma busca em outra página não conta de novo).
  const daLista = lerFiltros(paraParametros(filtros, { pagina: estado.pagina, ordem: estado.ordem }));
  const ctx = await contextoDaPagina();
  // Raio ou órgão sem o Pro: não busca nem conta; a lista mostra o cartão do Pro.
  const proBloqueado = precisaPro(daLista) && (await semRecursoPro(ctx));
  const decisao = proBloqueado ? ({ permitido: true, usados: null } as const) : await decidirBusca(ctx, daLista, { avisar: true });
  const [inicial, atualizado, uso, cidades] = await Promise.all([
    decisao.permitido && !proBloqueado ? buscarEditais(daLista) : Promise.resolve(null),
    atualizadoEm(),
    usoDoDia(ctx),
    cidadesComPagina(),
  ]);
  // Página sem busca: o navegador começa a baixar os pontos do mapa junto com o HTML (vêm da CDN, URL_MAPA_BRASIL).
  if (!paraParametros(filtros).toString()) preload(URL_MAPA_BRASIL, { as: 'fetch', crossOrigin: 'anonymous' });
  const agora = new Date().toISOString();
  // Computador: uma tela só, as colunas ocupam a altura que sobra e cada uma rola por dentro.
  // Celular: a página rola, com o mapa em cima e a lista embaixo (a barra de baixo reserva o espaço dela no body).
  // A chave muda a cada desenho do servidor: o logo ou "Mapa" (href="/") com uma busca na tela recomeça o Explorador
  // (com a mesma chave o React manteria o estado da busca anterior sob o endereço novo). Mesmo endereço: a volta restaura.
  return (
    <div className="flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMarca()).replace(/</g, '\\u003c') }} />
      <Cabecalho uso={uso} />
      {inicial && busca.q?.trim() ? <Medir conversao="buscou" chave="dia" /> : null}
      <AtalhoRadar />
      <Explorador
        key={`${urlDaBusca(filtros, estado)}@${agora}`}
        filtrosIniciais={filtros}
        estadoInicial={estado}
        inicial={inicial}
        limiteInicial={decisao.permitido ? null : decisao.limite}
        proInicial={proBloqueado}
        agoraInicial={agora}
        atualizadoEm={atualizado}
      />
      <SobreInicio cidades={cidades} />
    </div>
  );
}
