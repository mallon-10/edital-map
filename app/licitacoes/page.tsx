import type { Metadata } from 'next';
import { connection } from 'next/server';
import { RotaLicitacoes } from '@/components/licitacoes/PaginaLicitacoes';
import type { Pagina } from '@/lib/seo/textos';
import { metadadosDaPagina } from '@/lib/servidor/licitacoes';

const BRASIL: Pagina = { assunto: null, uf: null };

export function generateMetadata(): Promise<Metadata> {
  return metadadosDaPagina(BRASIL);
}

export default async function Licitacoes() {
  await connection();
  return <RotaLicitacoes pagina={BRASIL} />;
}
