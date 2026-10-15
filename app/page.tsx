import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { Explorador } from '@/components/Explorador';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { lerFiltros } from '@/lib/filtros';
import { atualizadoEm, buscarEditais } from '@/lib/servidor/consultas';

export default async function Inicio() {
  await connection();
  const [inicial, atualizado] = await Promise.all([buscarEditais(lerFiltros(new URLSearchParams())), atualizadoEm()]);
  // No celular a página é uma tela só (mapa ocupa o que sobra); no computador volta ao fluxo normal.
  return (
    <div className="flex h-dvh flex-col md:block md:h-auto">
      <Cabecalho />
      <FaixaCobertura atualizadoEm={atualizado} />
      <Explorador inicial={inicial} agoraInicial={new Date().toISOString()} />
    </div>
  );
}
