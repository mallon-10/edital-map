'use client';

import { useEffect, useState } from 'react';

export function MarcarInterno({ ativo }: { ativo: boolean }) {
  const [feito, setFeito] = useState(false);
  useEffect(() => {
    if (!ativo) return;
    fetch('/api/interno', { method: 'POST' })
      .then((r) => setFeito(r.ok))
      .catch(() => undefined);
  }, [ativo]);
  if (!ativo) return null;
  return (
    <p role="status" className="rounded-sm bg-rio-soft px-3 py-2 text-sm text-rio">
      {feito ? 'Este navegador foi marcado como interno: suas buscas não contam no portão.' : 'Marcando este navegador como interno…'}
    </p>
  );
}
