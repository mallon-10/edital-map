'use client';

import { useEffect } from 'react';

/**
 * Registra a visita ao sair do Meu Radar (fechar a aba, ir a outra página do site, trocar de app no celular):
 * "Novas desde a sua última visita" passa a contar daqui. Trocar ordem ou página não desmonta o componente e não registra.
 * Escuta pagehide e também visibilitychange → hidden (o Safari do iPhone muitas vezes pula o pagehide ao trocar de app
 * ou matar a aba). Um registro por vez na tela: esconder e fechar em seguida não manda dois; voltar pelo bfcache
 * (pageshow com persisted) libera um novo.
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
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'hidden') registrar();
    };
    const aoMostrar = (e: PageTransitionEvent) => {
      if (e.persisted) feito = false;
    };
    window.addEventListener('pagehide', registrar);
    window.addEventListener('pageshow', aoMostrar);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      window.removeEventListener('pagehide', registrar);
      window.removeEventListener('pageshow', aoMostrar);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      registrar();
    };
  }, []);
  return null;
}
