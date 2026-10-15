'use client';

import { useEffect, useState } from 'react';

type Estado = 'marcando' | 'ok' | 'erro';

export function MarcarInterno({ ativo }: { ativo: boolean }) {
  const [estado, setEstado] = useState<Estado>('marcando');
  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    fetch('/api/interno', { method: 'POST' })
      .then((r) => {
        if (!cancelado) setEstado(r.ok ? 'ok' : 'erro');
      })
      .catch(() => {
        if (!cancelado) setEstado('erro');
      });
    return () => {
      cancelado = true;
    };
  }, [ativo]);
  if (!ativo) return null;
  if (estado === 'erro') {
    return (
      <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">
        Não deu para marcar este navegador. Recarregue a página para tentar de novo.
      </p>
    );
  }
  return (
    <p role="status" className="rounded-sm bg-rio-soft px-3 py-2 text-sm text-rio">
      {estado === 'ok'
        ? 'Este navegador foi marcado como interno: suas visitas não entram nas métricas do Edital Map.'
        : 'Marcando este navegador como interno…'}
    </p>
  );
}
