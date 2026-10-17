import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { lerFiltros } from '@/lib/filtros';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usoDoDia } from '@/lib/servidor/uso';

export default async function Inicio() {
  await connection();
  const [inicial, atualizado, uso] = await Promise.all([
    buscarEditais(lerFiltros(new URLSearchParams())),
    atualizadoEm(),
    contextoDaPagina().then(usoDoDia),
  ]);
  // Uma tela só: as colunas ocupam a altura que sobra e cada uma rola por dentro.
  return (
    <div className="flex h-dvh flex-col">
      <Cabecalho uso={uso} />
      <Explorador inicial={inicial} agoraInicial={new Date().toISOString()} atualizadoEm={atualizado} />
    </div>
  );
}
