import { ImageResponse } from 'next/og';
import { Quadrado } from '@/lib/seo/imagens';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<Quadrado lado={180} />, size);
}
