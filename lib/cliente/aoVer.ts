import { useEffect, useRef } from 'react';

/** Chama `aoVer` uma vez, quando o elemento entra na tela (uma cópia escondida por CSS, a do outro tamanho de tela, nunca dispara). */
export function useAoVer<T extends Element>(aoVer: () => void) {
  const alvo = useRef<T>(null);
  const atual = useRef(aoVer);
  useEffect(() => {
    atual.current = aoVer;
  });
  useEffect(() => {
    const el = alvo.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        atual.current();
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return alvo;
}
