import type { Metadata } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--fonte-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--fonte-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Edital Map', template: '%s · Edital Map' },
  description: 'Licitações abertas no mapa: encontre editais do que sua empresa vende.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
