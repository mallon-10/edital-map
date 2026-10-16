import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { lerFiltros } from '@/lib/filtros';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';

export default async function Inicio() {
  await connection();
  const [inicial, atualizado] = await Promise.all([buscarEditais(lerFiltros(new URLSearchParams())), atualizadoEm()]);
  // Uma tela só: as colunas ocupam a altura que sobra e cada uma rola por dentro.
  return (
    <div className="flex h-dvh flex-col">
      <Cabecalho />
      <Explorador inicial={inicial} agoraInicial={new Date().toISOString()} atualizadoEm={atualizado} />
    </div>
  );
}
