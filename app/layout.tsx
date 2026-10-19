import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BarraCelularGlobal } from '@/components/BarraCelular';
import { Rodape } from '@/components/Rodape';
import { TagGoogle } from '@/components/TagGoogle';
import { NOME_SITE, SITE_URL } from '@/lib/seo/site';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--fonte-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--fonte-mono', display: 'swap' });

const DESCRICAO = 'Licitações abertas no mapa: encontre editais do que sua empresa vende, direto do PNCP e atualizados a cada 3 horas.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Edital Map · Licitações abertas no mapa', template: '%s · Edital Map' },
  description: DESCRICAO,
  openGraph: { type: 'website', locale: 'pt_BR', siteName: NOME_SITE, description: DESCRICAO },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

/** viewport-fit=cover: a barra de baixo do celular usa a área segura do iPhone (env(safe-area-inset-bottom)). */
export const viewport: Viewport = { viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Rodape />
        <BarraCelularGlobal />
        <TagGoogle />
      </body>
    </html>
  );
}
