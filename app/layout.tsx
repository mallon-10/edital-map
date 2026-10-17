import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BarraCelularGlobal } from '@/components/BarraCelular';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--fonte-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--fonte-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Edital Map', template: '%s · Edital Map' },
  description: 'Licitações abertas no mapa: encontre editais do que sua empresa vende.',
  robots: { index: false, follow: false },
};

/** viewport-fit=cover: a barra de baixo do celular usa a área segura do iPhone (env(safe-area-inset-bottom)). */
export const viewport: Viewport = { viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <BarraCelularGlobal />
      </body>
    </html>
  );
}
