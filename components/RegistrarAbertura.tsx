'use client';

import { useEffect, useRef } from 'react';
import { registrar } from '@/lib/cliente/registrar';

export function RegistrarAbertura({ slug }: { slug: string }) {
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    registrar('abriu_edital', { edital: slug });
  }, [slug]);
  return null;
}
