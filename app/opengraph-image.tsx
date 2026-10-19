import { ImageResponse } from 'next/og';
import { Compartilhar } from '@/lib/seo/imagens';

export const alt = 'Edital Map: licitações abertas no Brasil, no mapa';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function ImagemCompartilhar() {
  return new ImageResponse(<Compartilhar />, size);
}
