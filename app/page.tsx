import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { lerFiltros, paraParametros } from '@/lib/filtros';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';
import { municipioPorIbge, orgaoPorCnpj } from '@/lib/servidor/nomes';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { decidirBusca, usoDoDia } from '@/lib/servidor/uso';
import { lerBuscaDaUrl, montarTela, paraUrlSearchParams, urlDaBusca } from '@/lib/urlBusca';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Página inicial. A busca vem do endereço (/?q=luva&uf=SC&…) e conta no limite do dia como a de /api/busca. */
export default async function Inicio({ searchParams }: Props) {
  await connection();
  const { busca, tela } = lerBuscaDaUrl(paraUrlSearchParams(await searchParams));
  const cnpj = busca.orgao;
  // Nomes para os chips; se a consulta falhar, o filtro só sai da tela.
  const [cidade, orgao] = await Promise.all([
    busca.ibge ? municipioPorIbge(busca.ibge).catch(() => null) : Promise.resolve(null),
    cnpj ? orgaoPorCnpj(cnpj).catch(() => null) : Promise.resolve(null),
  ]);
  const filtros = montarTela(busca, cidade, orgao);
  // A mesma busca que a lista pede a /api/busca (mesma chave no limite do dia). O navegador não repete o pedido da lista
  // ao abrir (recebe `inicial`) e o mapa leva os mesmos parâmetros: a busca do endereço conta uma vez só.
  const daLista = lerFiltros(paraParametros(filtros));
  const ctx = await contextoDaPagina();
  const decisao = await decidirBusca(ctx, daLista, { avisar: true });
  const [inicial, atualizado, uso] = await Promise.all([
    decisao.permitido ? buscarEditais(daLista) : Promise.resolve(null),
    atualizadoEm(),
    usoDoDia(ctx),
  ]);
  const agora = new Date().toISOString();
  // Computador: uma tela só, as colunas ocupam a altura que sobra e cada uma rola por dentro.
  // Celular: a página rola, com o mapa em cima e a lista embaixo (a barra de baixo reserva o espaço dela no body).
  // A chave muda a cada desenho do servidor: o logo ou "Mapa" (href="/") com uma busca na tela recomeça o Explorador
  // (com a mesma chave o React manteria o estado da busca anterior sob o endereço novo). Mesmo endereço: a volta restaura.
  return (
    <div className="flex flex-col lg:h-dvh">
      <Cabecalho uso={uso} />
      <Explorador
        key={`${urlDaBusca(filtros, tela)}@${agora}`}
        filtrosIniciais={filtros}
        telaInicial={tela}
        inicial={inicial}
        limiteInicial={decisao.permitido ? null : decisao.limite}
        agoraInicial={agora}
        atualizadoEm={atualizado}
      />
    </div>
  );
}
