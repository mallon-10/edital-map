'use client';

import { useEffect } from 'react';

/**
 * Registra a visita ao sair do Meu Radar (fechar a aba, ir a outra página do site): "Novas desde a sua última visita"
 * passa a contar daqui. Trocar ordem ou página não desmonta o componente e não registra.
 * fetch com keepalive (e não sendBeacon): a rota só aceita JSON do próprio site (recusaForaDoSite), e o sendBeacon
 * não manda application/json; o keepalive deixa o pedido terminar depois que a página fecha.
 */
export function RegistrarVisitaRadar() {
  useEffect(() => {
    let feito = false;
    const registrar = () => {
      if (feito) return;
      feito = true;
      try {
        void fetch('/api/radar/visita', {
          method: 'POST',
          keepalive: true,
          headers: { 'content-type': 'application/json' },
          body: '{}',
        }).catch(() => {});
      } catch {
        // medição secundária
      }
    };
    window.addEventListener('pagehide', registrar);
    return () => {
      window.removeEventListener('pagehide', registrar);
      registrar();
    };
  }, []);
  return null;
}
