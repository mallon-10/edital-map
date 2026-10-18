'use client';

import { useEffect, useState } from 'react';

type Estado = 'parado' | 'marcando' | 'interno' | 'dono' | 'erro';

/** `#dono=<segredo>`: o segredo fica depois do #, que o navegador não manda ao servidor (nem aos logs da Vercel). */
function segredoDoHash(): string | null {
  const m = /^#dono=(.+)$/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * /sobre?interno=1 marca o navegador como interno (fora das métricas). /sobre#dono=<segredo> marca também como dono
 * (sem limites e com o Pro): o segredo segue no corpo do POST e sai do endereço logo em seguida.
 */
export function MarcarInterno({ ativo }: { ativo: boolean }) {
  const [estado, setEstado] = useState<Estado>('parado');
  useEffect(() => {
    const segredo = segredoDoHash();
    if (!ativo && !segredo) return;
    if (segredo) {
      // Tira o segredo do endereço mantendo o estado do Next (replaceState com null quebraria o Voltar).
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    let cancelado = false;
    setEstado('marcando');
    fetch('/api/interno', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(segredo ? { valor: segredo } : {}),
    })
      .then(async (r) => {
        if (cancelado) return;
        if (!r.ok) return setEstado('erro');
        const j = (await r.json().catch(() => ({}))) as { dono?: boolean };
        setEstado(j.dono ? 'dono' : segredo ? 'erro' : 'interno');
      })
      .catch(() => {
        if (!cancelado) setEstado('erro');
      });
    return () => {
      cancelado = true;
    };
  }, [ativo]);
  if (estado === 'parado') return null;
  if (estado === 'erro') {
    return (
      <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">
        Não deu para marcar este navegador. Confira o endereço e recarregue a página para tentar de novo.
      </p>
    );
  }
  const texto = {
    marcando: 'Marcando este navegador…',
    interno: 'Este navegador foi marcado como interno: suas visitas não entram nas métricas do Edital Map.',
    dono: 'Este navegador é do dono: sem limites, com o plano Pro e fora das métricas.',
  }[estado];
  return (
    <p role="status" className="rounded-sm bg-rio-soft px-3 py-2 text-sm text-rio">
      {texto}
    </p>
  );
}
