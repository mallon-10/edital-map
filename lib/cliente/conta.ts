import { useEffect, useState } from 'react';

/** E-mail da conta deste navegador (ou null), perguntado ao servidor uma vez por carga de página. */
let pedido: Promise<string | null> | null = null;

export function lerConta(): Promise<string | null> {
  pedido ??= fetch('/api/conta', { cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<{ email?: unknown }>) : { email: null }))
    .then((c) => (typeof c.email === 'string' ? c.email : null))
    .catch(() => null);
  return pedido;
}

/** Depois de sair (e nos testes): o próximo lerConta pergunta de novo. */
export function esquecerConta(): void {
  pedido = null;
}

export type EstadoConta = { carregando: true; email: null } | { carregando: false; email: string | null };

export function useConta(): EstadoConta {
  const [estado, setEstado] = useState<EstadoConta>({ carregando: true, email: null });
  useEffect(() => {
    let ativo = true;
    void lerConta().then((email) => {
      if (ativo) setEstado({ carregando: false, email });
    });
    return () => {
      ativo = false;
    };
  }, []);
  return estado;
}
