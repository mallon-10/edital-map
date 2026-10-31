'use client';

import { useEffect, useRef } from 'react';
import { rastrear } from '@/lib/cliente/rastrear';
import { registrar } from '@/lib/cliente/registrar';

export function RegistrarAbertura({ slug }: { slug: string }) {
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    registrar('abriu_edital', { edital: slug });
    rastrear('edital_detail_viewed', { edital: slug });
  }, [slug]);
  return null;
}
