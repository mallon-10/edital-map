import type { Metadata, Viewport } from 'next';
import { VslCurso } from '@/components/curso/VslCurso';

const DESCRICAO =
  'Aprenda como funciona uma licitação, onde encontrar as oportunidades do seu ramo, quais documentos separar e como montar o preço da proposta, começando do zero.';

/** Página de anúncio (VSL): fora do Google, como a página de vendas de referência. */
export const metadata: Metadata = {
  title: { absolute: 'Curso de Licitação · Edital Map' },
  description: DESCRICAO,
  robots: { index: false, follow: false },
  alternates: { canonical: '/cursolicitacao' },
  openGraph: { title: 'Aprenda a vender para o governo, mesmo sendo uma empresa pequena', description: DESCRICAO, url: '/cursolicitacao' },
};

export const viewport: Viewport = { themeColor: '#0c2340', viewportFit: 'cover' };

export default function PaginaCursoLicitacao() {
  return <VslCurso />;
}
