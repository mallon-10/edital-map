'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const INTERVALO_MS = 3000;
const LIMITE_MS = 2 * 60_000;

/** Enquanto o aviso da Cakto não chega: pergunta a cada 3 s, por até 2 min, e recarrega a página quando o plano ligar. */
export function EsperaPagamento({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [desistiu, setDesistiu] = useState(false);
  useEffect(() => {
    const inicio = Date.now();
    let parado = false;
    const id = window.setInterval(async () => {
      if (parado) return;
      if (Date.now() - inicio > LIMITE_MS) {
        window.clearInterval(id);
        setDesistiu(true);
        return;
      }
      const r = await fetch(`/api/checkout/estado?codigo=${encodeURIComponent(codigo)}`, { cache: 'no-store' }).catch(() => null);
      const j = r ? ((await r.json().catch(() => ({}))) as { estado?: string }) : {};
      if (j.estado === 'pago') {
        parado = true;
        window.clearInterval(id);
        router.refresh();
      }
    }, INTERVALO_MS);
    return () => {
      parado = true;
      window.clearInterval(id);
    };
  }, [codigo, router]);
  return (
    <p role="status" className="text-[15px] text-ink-muted">
      {desistiu
        ? 'Assim que a Cakto aprovar o pagamento, o plano liga neste navegador. Pix pode levar alguns minutos: recarregue esta página depois.'
        : 'Confirmando seu pagamento…'}
    </p>
  );
}
