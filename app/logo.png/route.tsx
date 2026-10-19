import { ImageResponse } from 'next/og';
import { Quadrado } from '@/lib/seo/imagens';

/** Logo em PNG (512×512) num endereço fixo, para os dados estruturados da marca (lib/seo/marca.ts). */
export function GET() {
  return new ImageResponse(<Quadrado lado={512} />, { width: 512, height: 512 });
}
